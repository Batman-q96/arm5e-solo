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

  console.log(`${MODULE_ID} | Ready`);
});
