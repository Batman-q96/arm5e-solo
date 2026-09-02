import { getCrossedDates } from "./dates.js";
import { applyFinanceResults, buildFinanceResults, getIncomingSources } from "./finances.js";
import { getSoloData, updateSoloData } from "./storage.js";

export function getAutomationSettings(data) {
  return {
    recalculateIncome: Boolean(data.automations?.recalculateIncome),
    updateWealth: Boolean(data.automations?.updateWealth),
    collectVis: Boolean(data.automations?.collectVis)
  };
}

export function getNetWealthChange(covenant) {
  const income = getIncomingSources(covenant).reduce((total, source) => total + (Number(source.system.incoming) || 0), 0);
  const expenses = Number(covenant.system.finances.totalExpenditure) || 0;
  return Math.round(income - expenses);
}

export async function createWealthCollectionDiaryEntry(covenant, year, season, change, wealth) {
  const entryData = {
    name: game.i18n.format("ARM5E_SOLO.Automations.WealthDiaryName", { year }),
    type: "diaryEntry",
    system: {
      description: `<p>${game.i18n.format("ARM5E_SOLO.Automations.WealthDiaryBody", { change, wealth })}</p>`,
      done: true,
      activity: "resource",
      dates: [{ season, year, applied: true }]
    }
  };
  return covenant.createEmbeddedDocuments("Item", [entryData]);
}

export async function processCovenantDates(covenant, previousDate, targetDate, rollStressDie) {
  if (!covenant.isOwner) return [];
  const data = getSoloData(covenant);
  const settings = getAutomationSettings(data);
  const runId = foundry.utils.randomID();
  const processed = [];
  for (const date of getCrossedDates(previousDate, targetDate)) {
    const events = [];
    if (date.season === "spring" && settings.recalculateIncome) {
      const selectedIds = data.incomeSourceSelectionInitialized ? data.selectedIncomeSourceIds : null;
      const sources = getIncomingSources(covenant, selectedIds);
      if (sources.length) {
        const rolls = await Promise.all(sources.map(() => rollStressDie(data.incomeBotchDice)));
        const results = buildFinanceResults(covenant, rolls, selectedIds);
        await applyFinanceResults(covenant, date.year, results, runId);
        events.push({ type: "income", count: results.length });
      }
    }
    if (date.season === "spring" && settings.updateWealth) {
      const change = getNetWealthChange(covenant);
      const wealth = (Number(covenant.system.finances.wealth) || 0) + change;
      await covenant.update({ "system.finances.wealth": wealth });
      await createWealthCollectionDiaryEntry(covenant, date.year, date.season, change, wealth);
      events.push({ type: "wealth", change, wealth });
    }
    if (settings.collectVis) {
      const visSources = covenant.items.filter((item) => item.type === "visSourcesCovenant" && item.system.season === date.season);
      for (const source of visSources) {
        await source.system.harvest();
        await source.update({ "system.yearHarvested": date.year });
      }
      if (visSources.length) events.push({ type: "vis", count: visSources.length });
    }
    if (events.length) processed.push({ date, events });
  }
  if (processed.length) {
    await updateSoloData(covenant, (updated) => {
      updated.automationHistory ??= [];
      updated.automationHistory.push(...processed);
      return updated;
    });
  }
  return processed;
}