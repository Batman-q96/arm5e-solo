import { applyFinanceResults, buildFinanceResults, getIncomingSources, hasFinanceResults } from "./finances.js";
import { buildAdventure, evaluateStorySource } from "./adventures.js";
import { getComplexity } from "./rules.js";
import { createYearRecord, getSoloData, getYearRecord, updateSoloData } from "./storage.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SoloDashboard extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.covenantId = options.covenantId ?? game.actors.find((actor) => actor.type === "covenant")?.id ?? null;
    this.financeResults = null;
  }

  static DEFAULT_OPTIONS = {
    id: "arm5e-solo-dashboard",
    classes: ["arm5e", "arm5e-solo"],
    window: { title: "ARM5E_SOLO.Dashboard.Title", resizable: true },
    position: { width: 720, height: "auto" },
    tag: "form",
    form: { handler: SoloDashboard.#onSubmit, submitOnChange: true, closeOnSubmit: false },
    actions: {
      rollFinances: SoloDashboard.rollFinances,
      applyFinances: SoloDashboard.applyFinances,
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
      financeResults: this.financeResults,
      hasFinances: covenant && year ? hasFinanceResults(covenant, year) : false,
      adventures: yearRecord?.adventures ?? [],
      sources: covenant ? getIncomingSources(covenant).map((source) => ({
        id: source.id,
        name: source.name,
        type: source.system.type,
        income: source.system.incoming
      })) : [],
      storySources: soloData?.storySources ?? [],
      year
    };
  }

  static async #onSubmit(event, form, formData) {
    if (formData.object.covenantId !== this.covenantId) {
      this.covenantId = formData.object.covenantId;
      this.financeResults = null;
      this.render();
      return;
    }
    if (!this.covenant || !this.covenant.isOwner || !formData.object.storySources) return;
    const sources = Object.values(foundry.utils.expandObject(formData.object.storySources));
    await updateSoloData(this.covenant, (data) => {
      data.storySources = sources.map((source) => ({
        id: source.id,
        name: source.name?.trim() || game.i18n.localize("ARM5E_SOLO.Adventure.UnnamedSource"),
        severity: source.severity === "major" ? "major" : "minor",
        returnPressure: Number(source.returnPressure) || 0
      }));
      return data;
    });
  }

  static async rollFinances() {
    await this._rollFinances();
  }

  async _rollFinances() {
    if (!this.covenant) return ui.notifications.warn(game.i18n.localize("ARM5E_SOLO.Dashboard.NoCovenant"));
    const sources = getIncomingSources(this.covenant);
    if (!sources.length) return ui.notifications.warn(game.i18n.localize("ARM5E_SOLO.Finance.NoSources"));
    const rolls = [];
    for (const source of sources) {
      const roll = new CONFIG.Dice.ArsRoll("1ds");
      await roll.roll();
      const die = roll.dice[0];
      const botch = Boolean(die?.botchCheck && Number(roll.botches) > 0);
      const naturalZero = roll.total === 0 && !botch;
      rolls.push({
        total: roll.total,
        naturalZero,
        botch
      });
      await this._createFinanceRollMessage(roll, source, botch);
    }
    this.financeResults = buildFinanceResults(this.covenant, rolls);
    this.render();
  }

  async _createFinanceRollMessage(roll, source, botch) {
    const messageClass = getDocumentClass("ChatMessage");
    const system = {
      img: null,
      label: game.i18n.format("ARM5E_SOLO.Finance.RollFlavor", { source: source.name }),
      confidence: { allowed: false, score: 0, used: 0 },
      rootMessage: null,
      roll: {
        img: null,
        itemUuid: null,
        type: "option",
        details: "",
        botchCheck: Boolean(roll.botchCheck),
        botches: botch ? roll.botches : 0,
        actorType: "covenant",
        secondaryScore: 0,
        divider: 1,
        difficulty: 0
      },
      impact: {
        applied: false,
        fatigueLevelsLost: 0,
        fatigueLevelsPending: 0,
        fatigueLevelsFail: 0,
        woundGravity: 0
      }
    };
    const messageData = await roll.toMessage(
      {
        flavor: `<p>${foundry.utils.escapeHTML(system.label)}</p>`,
        speaker: ChatMessage.getSpeaker({ actor: this.covenant }),
        system,
        type: "roll"
      },
      { create: false }
    );
    const message = new messageClass(messageData);
    await messageClass.create(message.toObject());
  }

  static async applyFinances() {
    await this._applyFinances();
  }

  async _applyFinances() {
    if (!this.covenant || !this.financeResults?.length) return;
    const year = game.settings.get("arm5e", "currentDate")?.year;
    if (!Number.isInteger(year)) return ui.notifications.error(game.i18n.localize("ARM5E_SOLO.Dashboard.NoYear"));
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("ARM5E_SOLO.Finance.ConfirmTitle") },
      content: `<p>${game.i18n.localize("ARM5E_SOLO.Finance.ConfirmContent")}</p>`
    });
    if (!confirmed) return;
    await applyFinanceResults(this.covenant, year, this.financeResults);
    this.financeResults = null;
    ui.notifications.info(game.i18n.localize("ARM5E_SOLO.Finance.Applied"));
    this.render();
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