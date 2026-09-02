export const MODULE_ID = "arm5e-solo";
const FLAG_KEY = "soloData";
const SCHEMA_VERSION = 1;

export function createSoloData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    incomeBotchDice: 1,
    automations: {},
    incomeSourceSelectionInitialized: false,
    selectedIncomeSourceIds: [],
    storySources: [],
    years: {}
  };
}

export function normalizeSoloData(data) {
  const normalized = data && typeof data === "object" ? foundry.utils.deepClone(data) : createSoloData();
  normalized.schemaVersion = SCHEMA_VERSION;
  normalized.incomeBotchDice = Number.isInteger(normalized.incomeBotchDice)
    ? Math.max(0, normalized.incomeBotchDice)
    : 1;
  normalized.incomeSourceSelectionInitialized ??= false;
  normalized.automations ??= {};
  normalized.automationHistory ??= [];
  normalized.selectedIncomeSourceIds ??= [];
  normalized.storySources ??= [];
  normalized.years ??= {};
  return normalized;
}

export function getSoloData(covenant) {
  return normalizeSoloData(covenant.getFlag(MODULE_ID, FLAG_KEY));
}

export async function updateSoloData(covenant, updater) {
  if (!covenant.isOwner) throw new Error("You do not have permission to update this covenant.");
  const data = getSoloData(covenant);
  const updated = await updater(data);
  const normalized = normalizeSoloData(updated ?? data);
  await covenant.setFlag(MODULE_ID, FLAG_KEY, normalized);
  return normalized;
}

export function getYearRecord(data, year) {
  const key = String(year);
  return data.years[key] ?? null;
}

export function createYearRecord(year) {
  return {
    year,
    finances: [],
    adventures: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}