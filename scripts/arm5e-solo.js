import { openSoloDashboard } from "./solo-dashboard.js";
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
});

Hooks.once("ready", () => {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (game.system.id !== "arm5e") {
    ui.notifications.warn(game.i18n.localize("ARM5E_SOLO.SystemRequired"));
    return;
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
  if (!game.settings.get(MODULE_ID, "enabled") || game.system.id !== "arm5e" || date.season !== "spring") return;
  const covenantNeedsSetup = game.actors.some(
    (actor) => actor.type === "covenant" && actor.isOwner && !hasFinanceResults(actor, date.year)
  );
  if (covenantNeedsSetup) ui.notifications.info(game.i18n.format("ARM5E_SOLO.Dashboard.YearReminder", { year: date.year }));
});
