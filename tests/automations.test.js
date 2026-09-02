import assert from "node:assert/strict";
import test from "node:test";
import { getAutomationSettings, getNetWealthChange } from "../scripts/automations.js";

test("covenant automation toggles default to disabled", () => {
  assert.deepEqual(getAutomationSettings({}), {
    recalculateIncome: false,
    updateWealth: false,
    collectVis: false
  });
});

test("annual wealth change is income minus post-savings expenditure", () => {
  const covenant = {
    items: [
      { type: "incomingSource", system: { incoming: 100 } },
      { type: "incomingSource", system: { incoming: 35 } },
      { type: "visSourcesCovenant", system: { pawns: 3 } }
    ],
    system: { finances: { totalExpenditure: 80 } }
  };
  assert.equal(getNetWealthChange(covenant), 55);
});