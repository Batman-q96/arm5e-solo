import { getAdventureOrigin, getChallengeType, getComplexity, getDifficulty, getTiming } from "./rules.js";

export function getStoryRollCount(source) {
  if (source.severity === "major") return 3 + (source.returnPressure ?? 0);
  return 1 + (source.returnPressure ?? 0);
}

export function evaluateStorySource(source, simpleRolls) {
  const requiredRolls = getStoryRollCount(source);
  if (simpleRolls.length !== requiredRolls) throw new Error("Unexpected number of story source rolls.");
  return {
    sourceId: source.id,
    rolls: simpleRolls,
    adventures: simpleRolls.filter((roll) => roll === 1).length,
    badOmens: simpleRolls.filter((roll) => roll === 10).length
  };
}

export function buildAdventure({ id, sourceId, difficultyRoll, difficultyBotch = false, originRoll, timingRoll, complexityRoll, complexityAdditionalRolls = [], challengeRolls, yearsAfterGauntlet = null }) {
  const timing = getTiming(timingRoll);
  const difficulty = getDifficulty(difficultyRoll, {
    botch: difficultyBotch,
    yearsAfterGauntlet,
    season: timing.season
  });
  const complexity = getComplexity(complexityRoll, complexityAdditionalRolls);
  if (challengeRolls.length !== complexity.challengeSets) {
    throw new Error("Each challenge set requires one adventure type roll.");
  }
  return {
    id,
    sourceId,
    status: "draft",
    difficulty,
    origin: getAdventureOrigin(originRoll),
    timing,
    complexity,
    challenges: challengeRolls.map((roll, index) => ({ index: index + 1, ...getChallengeType(roll) }))
  };
}

export function markOptOut(adventure) {
  return { ...adventure, status: "optedOut", optedOutAt: new Date().toISOString() };
}