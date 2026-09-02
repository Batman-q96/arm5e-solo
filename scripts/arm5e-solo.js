import { openSoloDashboard } from "./solo-dashboard.js";
import { normalizeDate } from "./dates.js";
import { hasFinanceResults } from "./finances.js";

const MODULE_ID = "arm5e-solo";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing`);

  game.settings.register(MODULE_ID, "enabled", {
    name: "ARM5E_SOLO.Settings.Enabled.Name",
    hint: "ARM5E_SOLO.Settings.Enabled.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "lastComputedDate", {
    scope: "world",
    config: false,
    type: Object,
    default: null
  });
});

Hooks.once("ready", async () => {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
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
  if (!game.settings.get(MODULE_ID, "enabled") || game.system.id !== "arm5e") return;
  controls.arm5eSolo = {
    name: "arm5eSolo",
    title: game.i18n.localize("ARM5E_SOLO.Dashboard.Title"),
    icon: "fas fa-dice-d20",
    visible: true,
    tools: {
      dashboard: {
        name: "dashboard",
        title: game.i18n.localize("ARM5E_SOLO.Dashboard.Open"),
        icon: "fas fa-calendar-days",
        visible: true,
        button: true,
        onChange: (event, active) => active && openSoloDashboard()
      }
    }
  };
});

Hooks.on("arm5e-date-change", (date) => {
  if (!game.settings.get(MODULE_ID, "enabled") || game.system.id !== "arm5e") return;
  const targetDate = normalizeDate(date);
  const previousDate = game.settings.get(MODULE_ID, "lastComputedDate");
  if (targetDate.season === "spring") {
    const covenantNeedsSetup = game.actors.some(
      (actor) => actor.type === "covenant" && actor.isOwner && !hasFinanceResults(actor, targetDate.year)
    );
    if (covenantNeedsSetup) ui.notifications.info(game.i18n.format("ARM5E_SOLO.Dashboard.YearReminder", { year: targetDate.year }));
  }
  if (!previousDate || previousDate.year !== targetDate.year || previousDate.season !== targetDate.season) {
    game.settings.set(MODULE_ID, "lastComputedDate", targetDate);
  }
});
