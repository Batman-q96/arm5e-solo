import assert from "node:assert/strict";
import test from "node:test";
import { buildAdventure, evaluateStorySource, getStoryRollCount } from "../scripts/adventures.js";

test("major story sources roll three dice and retain bad omens", () => {
  const source = { id: "enemy", severity: "major" };
  assert.equal(getStoryRollCount(source), 3);
  assert.deepEqual(evaluateStorySource(source, [1, 10, 5]), {
    sourceId: "enemy", rolls: [1, 10, 5], adventures: 1, badOmens: 1
  });
});

test("adventure setup combines origin, timing, difficulty, complexity and challenge types", () => {
  const adventure = buildAdventure({
    id: "adventure-1", sourceId: "enemy", difficultyRoll: 6, originRoll: 35,
    timingRoll: 8, complexityRoll: 4, challengeRolls: [18, 91], yearsAfterGauntlet: 5
  });
  assert.equal(adventure.difficulty.difficulty, 13);
  assert.equal(adventure.origin.type, "hermeticOne");
  assert.equal(adventure.timing.season, "winter");
  assert.equal(adventure.complexity.challengeSets, 2);
  assert.deepEqual(adventure.challenges.map((challenge) => challenge.type), ["social", "characterChoice"]);
});