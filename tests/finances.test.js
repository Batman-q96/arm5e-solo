import assert from "node:assert/strict";
import test from "node:test";
import { buildFinanceResults, getIncomingSources } from "../scripts/finances.js";

const covenant = {
  items: [
    { id: "grain", name: "Grain", type: "incomingSource", system: { type: "agriculture", incoming: 100 } },
    { id: "rent", name: "Rent", type: "incomingSource", system: { type: "property", incoming: 40 } },
    { id: "not-income", name: "Vis", type: "visStockCovenant", system: {} }
  ]
};

test("finance processing targets every covenant incoming source independently", () => {
  assert.equal(getIncomingSources(covenant).length, 2);
  const results = buildFinanceResults(covenant, [{ total: 10 }, { total: 0 }]);
  assert.deepEqual(results.map((result) => result.resultingIncome), [120, 32]);
  assert.deepEqual(results.map((result) => result.sourceId), ["grain", "rent"]);
});

test("a natural zero and a botch remain distinct in finance history", () => {
  const results = buildFinanceResults(covenant, [
    { total: 0, naturalZero: true, botch: false },
    { total: 0, naturalZero: true, botch: true }
  ]);
  assert.deepEqual(results.map((result) => result.effect), ["contraction", "slump"]);
  assert.deepEqual(results.map((result) => result.naturalZero), [true, true]);
  assert.deepEqual(results.map((result) => result.botch), [false, true]);
});

test("finance processing can target persisted income source selections", () => {
  const results = buildFinanceResults(covenant, [{ total: 9 }], ["rent"]);
  assert.equal(results.length, 1);
  assert.equal(results[0].sourceId, "rent");
  assert.equal(results[0].resultingIncome, 42);
});

test("an empty persisted selection rolls no income sources", () => {
  assert.equal(getIncomingSources(covenant, []).length, 0);
});