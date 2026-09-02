import { buildAdventure, evaluateStorySource } from "./adventures.js";
import { getComplexity } from "./rules.js";
import { createYearRecord, getSoloData, getYearRecord, updateSoloData } from "./storage.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SoloDashboard extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.covenantId = options.covenantId ?? game.actors.find((actor) => actor.type === "covenant")?.id ?? null;
  }

  static DEFAULT_OPTIONS = {
    id: "arm5e-solo-dashboard",
    classes: ["arm5e", "arm5e-solo"],
    window: { title: "ARM5E_SOLO.Dashboard.Title", resizable: true },
    position: { width: 720, height: "auto" },
    tag: "form",
    form: { handler: SoloDashboard.#onSubmit, submitOnChange: true, closeOnSubmit: false },
    actions: {
      addStorySource: SoloDashboard.addStorySource,
      deleteStorySource: SoloDashboard.deleteStorySource,
      generateAdventures: SoloDashboard.generateAdventures
    }
  };

  static PARTS = {
    content: { template: "modules/arm5e-solo/templates/solo-dashboard.hbs" }
  };

  get covenant() {
    return game.actors.get(this.covenantId);
  }

  async _prepareContext() {
    const covenant = this.covenant;
    const year = game.settings.get("arm5e", "currentDate")?.year;
    const soloData = covenant ? getSoloData(covenant) : null;
    const yearRecord = soloData && year ? getYearRecord(soloData, year) : null;
    return {
      canEdit: covenant?.isOwner ?? false,
      covenant,
      covenants: game.actors.filter((actor) => actor.type === "covenant"),
      adventures: yearRecord?.adventures ?? [],
      storySources: soloData?.storySources ?? [],
      year
    };
  }

  static async #onSubmit(event, form, formData) {
    if (formData.object.covenantId !== this.covenantId) {
      this.covenantId = formData.object.covenantId;
      this.render();
      return;
    }
    if (!this.covenant || !this.covenant.isOwner) return;
    await updateSoloData(this.covenant, (data) => {
      if (formData.object.storySources) {
        const sources = Object.values(foundry.utils.expandObject(formData.object.storySources));
        data.storySources = sources.map((source) => ({
          id: source.id,
          name: source.name?.trim() || game.i18n.localize("ARM5E_SOLO.Adventure.UnnamedSource"),
          severity: source.severity === "major" ? "major" : "minor",
          returnPressure: Number(source.returnPressure) || 0
        }));
      }
      return data;
    });
  }

  static async addStorySource() {
    if (!this.covenant) return;
    await updateSoloData(this.covenant, (data) => {
      data.storySources.push({
        id: foundry.utils.randomID(),
        name: game.i18n.localize("ARM5E_SOLO.Adventure.UnnamedSource"),
        severity: "minor",
        returnPressure: 0
      });
      return data;
    });
    this.render();
  }

  static async deleteStorySource(event, target) {
    if (!this.covenant) return;
    await updateSoloData(this.covenant, (data) => {
      data.storySources = data.storySources.filter((source) => source.id !== target.dataset.sourceId);
      return data;
    });
    this.render();
  }

  static async generateAdventures() {
    await this._generateAdventures();
  }

  async _simpleDie() {
    return (await new Roll("1d10").evaluate()).total;
  }

  async _stressDie() {
    const roll = await new Roll("1ds").evaluate();
    return { total: roll.total, botch: roll.total === 0 };
  }

  async _getComplexityRolls() {
    const rollNode = async () => {
      const roll = await this._simpleDie();
      if (roll !== 10) return [roll];
      return [roll, ...(await rollNode()), ...(await rollNode())];
    };
    const rolls = await rollNode();
    const complexity = getComplexity(rolls[0], rolls.slice(1));
    return { initial: rolls[0], additional: rolls.slice(1), challengeSets: complexity.challengeSets };
  }

  async _generateAdventures() {
    if (!this.covenant) return ui.notifications.warn(game.i18n.localize("ARM5E_SOLO.Dashboard.NoCovenant"));
    const year = game.settings.get("arm5e", "currentDate")?.year;
    if (!Number.isInteger(year)) return ui.notifications.error(game.i18n.localize("ARM5E_SOLO.Dashboard.NoYear"));
    const soloData = getSoloData(this.covenant);
    const existing = getYearRecord(soloData, year);
    if (existing?.adventures?.length) return ui.notifications.warn(game.i18n.localize("ARM5E_SOLO.Adventure.AlreadyGenerated"));
    if (!soloData.storySources.length) return ui.notifications.warn(game.i18n.localize("ARM5E_SOLO.Adventure.NoSources"));

    const sourceResults = [];
    const drafts = [];
    let badOmens = 0;
    for (const source of soloData.storySources) {
      const count = source.severity === "major" ? 3 + source.returnPressure : 1 + source.returnPressure;
      const result = evaluateStorySource(source, await Promise.all(Array.from({ length: count }, () => this._simpleDie())));
      sourceResults.push(result);
      badOmens += result.badOmens;
      for (let index = 0; index < result.adventures; index += 1) {
        const complexity = await this._getComplexityRolls();
        const challengeRolls = await Promise.all(Array.from(
          { length: complexity.challengeSets },
          () => new Roll("1d100").evaluate().then((roll) => roll.total)
        ));
        const difficulty = await this._stressDie();
        drafts.push(buildAdventure({
          id: foundry.utils.randomID(), sourceId: source.id, difficultyRoll: difficulty.total,
          difficultyBotch: difficulty.botch, originRoll: await new Roll("1d100").evaluate().then((roll) => roll.total),
          timingRoll: await this._simpleDie(), complexityRoll: complexity.initial,
          complexityAdditionalRolls: complexity.additional, challengeRolls
        }));
      }
    }
    await updateSoloData(this.covenant, (data) => {
      const record = getYearRecord(data, year) ?? createYearRecord(year);
      record.storyRolls = sourceResults;
      record.badOmens = badOmens;
      record.adventures = drafts;
      record.updatedAt = new Date().toISOString();
      data.years[String(year)] = record;
      return data;
    });
    await ChatMessage.create({ content: `<p>${game.i18n.format("ARM5E_SOLO.Adventure.ChatSummary", { covenant: this.covenant.name, year, count: drafts.length, badOmens })}</p>` });
    ui.notifications.info(game.i18n.format("ARM5E_SOLO.Adventure.Generated", { count: drafts.length }));
    this.render();
  }
}

export function openSoloDashboard() {
  return new SoloDashboard().render(true);
}