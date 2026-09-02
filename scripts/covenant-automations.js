import { getAutomationSettings } from "./automations.js";
import { applyFinanceResults, buildFinanceResults, getAllFinanceRolls, getIncomingSources } from "./finances.js";
import { getSoloData, updateSoloData } from "./storage.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CovenantAutomations extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.covenantId = options.covenantId ?? game.actors.find((actor) => actor.type === "covenant")?.id ?? null;
  }

  static DEFAULT_OPTIONS = {
    id: "arm5e-covenant-automations",
    classes: ["arm5e", "arm5e-solo"],
    window: { title: "ARM5E_SOLO.Automations.Title" },
    position: { width: 640, height: "auto" },
    tag: "form",
    form: { handler: CovenantAutomations.#onSubmit, submitOnChange: true, closeOnSubmit: false },
    actions: { rollFinances: CovenantAutomations.rollFinances }
  };

  static PARTS = { content: { template: "modules/arm5e-solo/templates/covenant-automations.hbs" } };

  get covenant() {
    return game.actors.get(this.covenantId);
  }

  async _prepareContext() {
    const covenant = this.covenant;
    const soloData = covenant ? getSoloData(covenant) : null;
    return {
      covenant,
      covenants: game.actors.filter((actor) => actor.type === "covenant"),
      canEdit: covenant?.isOwner ?? false,
      automations: covenant ? getAutomationSettings(soloData) : {},
      incomeBotchDice: soloData?.incomeBotchDice ?? 1,
      financeRolls: soloData ? getAllFinanceRolls(soloData) : [],
      sources: covenant ? getIncomingSources(covenant).map((source) => ({
        id: source.id,
        name: source.name,
        type: source.system.type,
        income: source.system.incoming,
        selected: !soloData.incomeSourceSelectionInitialized || soloData.selectedIncomeSourceIds.includes(source.id)
      })) : []
    };
  }

  static async #onSubmit(event, form, formData) {
    if (formData.object.covenantId !== this.covenantId) {
      this.covenantId = formData.object.covenantId;
      this.render();
      return;
    }
    if (!this.covenant?.isOwner) return;
    await updateSoloData(this.covenant, (data) => {
      data.automations = {
        recalculateIncome: Boolean(form.querySelector('[name="automations.recalculateIncome"]')?.checked),
        updateWealth: Boolean(form.querySelector('[name="automations.updateWealth"]')?.checked),
        collectVis: Boolean(form.querySelector('[name="automations.collectVis"]')?.checked)
      };
      data.incomeBotchDice = Math.max(0, Math.floor(Number(formData.object.incomeBotchDice) || 0));
      const selected = form.querySelectorAll('input[name="selectedIncomeSourceIds"]:checked');
      data.selectedIncomeSourceIds = Array.from(selected, (input) => input.value);
      data.incomeSourceSelectionInitialized = true;
      return data;
    });
    this.render();
  }

  static async rollFinances() {
    await this._rollFinances();
  }

  async _rollFinances() {
    if (!this.covenant) return ui.notifications.warn(game.i18n.localize("ARM5E_SOLO.Dashboard.NoCovenant"));
    const soloData = getSoloData(this.covenant);
    const selectedIds = soloData.incomeSourceSelectionInitialized ? soloData.selectedIncomeSourceIds : null;
    const sources = getIncomingSources(this.covenant, selectedIds);
    if (!sources.length) return ui.notifications.warn(game.i18n.localize("ARM5E_SOLO.Finance.NoSources"));
    const rolls = [];
    for (const source of sources) {
      const roll = new CONFIG.Dice.ArsRoll(`${soloData.incomeBotchDice}ds`);
      await roll.roll();
      const die = roll.dice[0];
      const total = roll.total;
      const botch = total < 0 || Boolean(die?.botchCheck && Number(roll.botches) > 0);
      const naturalZero = total === 0 && !botch;
      rolls.push({ total, naturalZero, botch });
      await this._createFinanceRollMessage(roll, source, botch);
    }
    const results = buildFinanceResults(this.covenant, rolls, selectedIds);
    const year = game.settings.get("arm5e", "currentDate")?.year;
    if (!Number.isInteger(year)) return ui.notifications.error(game.i18n.localize("ARM5E_SOLO.Dashboard.NoYear"));
    await applyFinanceResults(this.covenant, year, results, foundry.utils.randomID());
    ui.notifications.info(game.i18n.localize("ARM5E_SOLO.Finance.Applied"));
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
}

export function openCovenantAutomations() {
  return new CovenantAutomations().render(true);
}