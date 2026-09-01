import assert from "node:assert/strict";
import test from "node:test";
import {
  applyIncomeMultiplier,
  getAdventureTime,
  getAdventureXp,
  getChallengeOutcome,
  getComplexity,
  getDifficulty,
  getFinanceResult
} from "../scripts/rules.js";

test("finance rolls map to their specified effects", () => {
  assert.equal(getFinanceResult(0).effect, "contraction");
  assert.equal(getFinanceResult(8).effect, "statusQuo");
  assert.equal(getFinanceResult(10).multiplier, 1.2);
  assert.equal(getFinanceResult(99).effect, "boom");
  assert.equal(getFinanceResult(5, { botch: true }).effect, "slump");
  assert.equal(applyIncomeMultiplier(100, 1.2), 120);
});

test("complexity uses the agreed Simple Die bands", () => {
  assert.equal(getComplexity(1).challengeSets, 1);
  assert.equal(getComplexity(6).challengeSets, 2);
  assert.equal(getComplexity(9).challengeSets, 3);
  assert.equal(getComplexity(10, [7, 4]).challengeSets, 5);
});

test("difficulty accounts for grace period and winter", () => {
  assert.equal(getDifficulty(6).difficulty, 15);
  assert.equal(getDifficulty(6, { yearsAfterGauntlet: 5, season: "winter" }).difficulty, 13);
});

test("outcomes, experience, and time follow the solo rules", () => {
  assert.deepEqual(getChallengeOutcome(0, 2), { rewards: 0, losses: 4, bonusXp: 0 });
  assert.deepEqual(getChallengeOutcome(3), { rewards: 1, losses: 0, bonusXp: 2 });
  assert.equal(getAdventureXp(15), 8);
  assert.equal(getAdventureTime({ difficulty: 15, challengeSets: 2, failedRolls: 3, botches: 1 }), 23);
  assert.equal(getAdventureTime({ difficulty: 15, challengeSets: 2, failedRolls: 3, botches: 1, reducedTimeUses: 2 }), 6);
});