import { openSoloDashboard } from "./solo-dashboard.js";
import { openCovenantAutomations } from "./covenant-automations.js";
import { normalizeDate } from "./dates.js";
import { processCovenantDates } from "./automations.js";
import { hasFinanceResults } from "./finances.js";

const MODULE_ID = "arm5e-solo";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing`);

  game.settings.register(MODULE_ID, "consolidateMenu", {
    name: "ARM5E_SOLO.Settings.ConsolidateMenu.Name",
    hint: "ARM5E_SOLO.Settings.ConsolidateMenu.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => ui.controls.render(true)
  });

  game.settings.register(MODULE_ID, "lastComputedDate", {
    scope: "world",
    config: false,
    type: Object,
    default: null
  });
});

Hooks.once("ready", async () => {
  if (game.system.id !== "arm5e") {
    ui.notifications.warn(game.i18n.localize("ARM5E_SOLO.SystemRequired"));
    return;
  }
  if (!game.settings.get(MODULE_ID, "lastComputedDate")) {
    const currentDate = game.settings.get("arm5e", "currentDate");
    if (currentDate) await game.settings.set(MODULE_ID, "lastComputedDate", normalizeDate(currentDate));
  }
  console.log(`${MODULE_ID} | Ready`);
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (game.system.id !== "arm5e") return;
  const soloTools = {
    soloDashboard: {
      name: "soloDashboard",
      order: 6,
      title: game.i18n.localize("ARM5E_SOLO.Dashboard.Open"),
      icon: "fas fa-calendar-days",
      visible: true,
      button: true,
      onChange: (event, active) => active && openSoloDashboard()
    },
    soloAutomations: {
      name: "soloAutomations",
      order: 7,
      title: game.i18n.localize("ARM5E_SOLO.Automations.Open"),
      icon: "fas fa-gears",
      visible: true,
      button: true,
      onChange: (event, active) => active && openCovenantAutomations()
    }
  };
  if (game.settings.get(MODULE_ID, "consolidateMenu") && controls.ArsMagica) {
    Object.assign(controls.ArsMagica.tools, soloTools);
    return;
  }
  controls.arm5eSolo = {
    name: "arm5eSolo",
    title: game.i18n.localize("ARM5E_SOLO.Dashboard.Title"),
    icon: "fas fa-dice-d20",
    visible: true,
    tools: {
      dashboard: soloTools.soloDashboard,
      automations: soloTools.soloAutomations
    }
  };
});

Hooks.on("arm5e-date-change", async (date) => {
  if (game.system.id !== "arm5e") return;
  const targetDate = normalizeDate(date);
  const previousDate = game.settings.get(MODULE_ID, "lastComputedDate");
  if (previousDate && game.user.isGM) {
    const rollStressDie = async (botchDice) => {
      const roll = new CONFIG.Dice.ArsRoll(`${botchDice}ds`);
      await roll.roll();
      return { total: roll.total, botch: roll.total < 0, naturalZero: roll.total === 0 };
    };
    for (const covenant of game.actors.filter((actor) => actor.type === "covenant")) {
      await processCovenantDates(covenant, previousDate, targetDate, rollStressDie);
    }
  }
  if (targetDate.season === "spring") {
    const covenantNeedsSetup = game.actors.some(
      (actor) => actor.type === "covenant" && actor.isOwner && !hasFinanceResults(actor, targetDate.year)
    );
    if (covenantNeedsSetup) ui.notifications.info(game.i18n.format("ARM5E_SOLO.Dashboard.YearReminder", { year: targetDate.year }));
  }
  if (!previousDate || previousDate.year !== targetDate.year || previousDate.season !== targetDate.season) {
    await game.settings.set(MODULE_ID, "lastComputedDate", targetDate);
  }
});
