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