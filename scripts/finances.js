import { applyIncomeMultiplier, getFinanceResult } from "./rules.js";
import { createYearRecord, getSoloData, getYearRecord, updateSoloData } from "./storage.js";

export function getIncomingSources(covenant, selectedIds = null) {
  const sources = covenant.items.filter((item) => item.type === "incomingSource");
  if (selectedIds === null) return sources;
  const selected = new Set(selectedIds);
  return sources.filter((source) => selected.has(source.id));
}

export function buildFinanceResults(covenant, rolls, selectedIds = null) {
  const sources = getIncomingSources(covenant, selectedIds);
  if (rolls.length !== sources.length) throw new Error("Each income source requires one finance roll.");
  return sources.map((source, index) => {
    const income = Number(source.system.incoming) || 0;
    const roll = rolls[index];
    const result = getFinanceResult(roll.total, { botch: roll.botch });
    return {
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.system.type,
      priorIncome: income,
      resultingIncome: applyIncomeMultiplier(income, result.multiplier),
      stressTotal: roll.total,
      naturalZero: Boolean(roll.naturalZero),
      botch: Boolean(roll.botch),
      effect: result.effect,
      multiplier: result.multiplier
    };
  });
}

export async function applyFinanceResults(covenant, year, results) {
  if (!covenant.isOwner) throw new Error("You do not have permission to update this covenant.");
  for (const result of results) {
    const source = covenant.items.get(result.sourceId);
    if (!source || source.type !== "incomingSource") continue;
    await source.update({ "system.incoming": result.resultingIncome });
  }
  return updateSoloData(covenant, (data) => {
    const record = getYearRecord(data, year) ?? createYearRecord(year);
    record.finances = results;
    record.financeRolls ??= [];
    record.financeRolls.push({ results, appliedAt: new Date().toISOString() });
    record.updatedAt = new Date().toISOString();
    data.years[String(year)] = record;
    return data;
  });
}

export function hasFinanceResults(covenant, year) {
  const record = getYearRecord(getSoloData(covenant), year);
  return Boolean(record?.finances?.length);
}