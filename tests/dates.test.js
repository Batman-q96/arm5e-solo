import assert from "node:assert/strict";
import test from "node:test";
import { getCrossedDates } from "../scripts/dates.js";

test("date cursor returns every seasonal boundary crossed", () => {
  assert.deepEqual(
    getCrossedDates({ year: 1220, season: "autumn" }, { year: 1223, season: "spring" }),
    [
      { year: 1220, season: "winter" },
      { year: 1221, season: "spring" },
      { year: 1221, season: "summer" },
      { year: 1221, season: "autumn" },
      { year: 1221, season: "winter" },
      { year: 1222, season: "spring" },
      { year: 1222, season: "summer" },
      { year: 1222, season: "autumn" },
      { year: 1222, season: "winter" },
      { year: 1223, season: "spring" }
    ]
  );
});