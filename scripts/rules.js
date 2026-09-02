export const FINANCE_EFFECTS = [
  { min: -Infinity, max: -1, effect: "slump", multiplier: 0.5 },
  { min: 0, max: 0, effect: "contraction", multiplier: 0.8 },
  { min: 1, max: 2, effect: "stagnation", multiplier: 0.95 },
  { min: 3, max: 8, effect: "statusQuo", multiplier: 1 },
  { min: 9, max: 9, effect: "growth", multiplier: 1.05 },
  { min: 10, max: 19, effect: "expansion", multiplier: 1.2 },
  { min: 20, max: Infinity, effect: "boom", multiplier: 1.5 }
];

export const DIFFICULTIES = [
  { min: -Infinity, max: 2, label: "easy", baseEaseFactor: 9 },
  { min: 3, max: 5, label: "average", baseEaseFactor: 12 },
  { min: 6, max: 8, label: "hard", baseEaseFactor: 15 },
  { min: 9, max: 12, label: "veryHard", baseEaseFactor: 18 },
  { min: 13, max: 19, label: "impressive", baseEaseFactor: 20 },
  { min: 20, max: 31, label: "remarkable", baseEaseFactor: 22 },
  { min: 32, max: Infinity, label: "almostImpossible", baseEaseFactor: 24 }
];

export const ADVENTURE_ORIGINS = [
  { min: 1, max: 5, type: "nobility", skills: ["charm", "etiquette", "intrigue"] },
  { min: 6, max: 10, type: "religion", skills: ["concentration", "etiquette", "churchLore"] },
  { min: 11, max: 13, type: "peasants", skills: ["carouse", "folkKen", "leadership"] },
  { min: 14, max: 25, type: "faerie", skills: ["faerieLore", "guile"] },
  { min: 26, max: 30, type: "official", skills: ["folkKen", "law", "organizationLore"] },
  { min: 31, max: 34, type: "criminal", skills: ["awareness", "guile", "stealth"] },
  { min: 35, max: 50, type: "hermeticOne", skills: ["artesLiberales", "codeOfHermes", "magicTheory"] },
  { min: 51, max: 60, type: "covenant", skills: ["concentration", "intrigue", "covenantLore"] },
  { min: 61, max: 62, type: "natural", skills: ["athletics", "hunt", "survival"] },
  { min: 63, max: 70, type: "supernatural", skills: ["faerieLore", "magicLore", "supernaturalAbility"] },
  { min: 71, max: 75, type: "nonHermetic", skills: ["awareness", "codeOfHermes", "magicLore"] },
  { min: 76, max: 80, type: "infernal", skills: ["folkKen", "guile", "infernalLore"] },
  { min: 81, max: 90, type: "hermeticTwo", skills: ["codeOfHermes", "guile", "law"] },
  { min: 91, max: 100, type: "hermeticThree", skills: ["awareness", "parmaMagica", "penetration"] }
];

export const CHALLENGE_TYPES = [
  { min: 1, max: 18, type: "social" },
  { min: 19, max: 36, type: "combat" },
  { min: 37, max: 54, type: "magic" },
  { min: 55, max: 72, type: "legalDiplomatic" },
  { min: 73, max: 90, type: "thrillerWilderness" },
  { min: 91, max: 100, type: "characterChoice" }
];

export function lookupRange(table, value) {
  const entry = table.find((candidate) => value >= candidate.min && value <= candidate.max);
  if (!entry) throw new RangeError(`No table entry for ${value}.`);
  return entry;
}

export function getFinanceResult(stressTotal, { botch = false } = {}) {
  const result = lookupRange(FINANCE_EFFECTS, botch ? -1 : stressTotal);
  return { ...result, stressTotal, botch };
}

export function applyIncomeMultiplier(income, multiplier) {
  if (!Number.isFinite(income) || income < 0) throw new RangeError("Income must be a non-negative number.");
  return Math.round(income * multiplier);
}

export function getComplexity(simpleDie, additionalRolls = []) {
  const rolls = [...additionalRolls];
  const resolve = (roll) => {
    if (!Number.isInteger(roll) || roll < 1 || roll > 10) {
      throw new RangeError("Complexity requires a Simple Die result from 1 to 10.");
    }
    if (roll <= 3) return { label: "simple", challengeSets: 1, rolls: [roll] };
    if (roll <= 6) return { label: "complex", challengeSets: 2, rolls: [roll] };
    if (roll <= 9) return { label: "veryComplex", challengeSets: 3, rolls: [roll] };
    if (rolls.length < 2) throw new RangeError("A result of 10 requires two additional Simple Die results.");
    const first = resolve(rolls.shift());
    const second = resolve(rolls.shift());
    return {
      label: "double",
      challengeSets: first.challengeSets + second.challengeSets,
      rolls: [roll, ...first.rolls, ...second.rolls]
    };
  };
  return resolve(simpleDie);
}

export function getDifficulty(stressTotal, { botch = false, yearsAfterGauntlet = null, season = null } = {}) {
  const result = lookupRange(DIFFICULTIES, botch ? -1 : stressTotal);
  const graceAdjustment = Number.isFinite(yearsAfterGauntlet) && yearsAfterGauntlet <= 5 ? -3 : 0;
  const winterAdjustment = season === "winter" ? 1 : 0;
  return {
    ...result,
    stressTotal,
    botch,
    graceAdjustment,
    winterAdjustment,
    difficulty: result.baseEaseFactor + graceAdjustment + winterAdjustment
  };
}

export function getChallengeOutcome(successes, botches = 0) {
  if (!Number.isInteger(successes) || successes < 0 || successes > 3) {
    throw new RangeError("Successes must be an integer from 0 to 3.");
  }
  if (!Number.isInteger(botches) || botches < 0) throw new RangeError("Botches must be a non-negative integer.");
  const base = [
    { rewards: 0, losses: 2, bonusXp: 0 },
    { rewards: 1, losses: 1, bonusXp: 0 },
    { rewards: 1, losses: 0, bonusXp: 0 },
    { rewards: 1, losses: 0, bonusXp: 2 }
  ][successes];
  return { ...base, losses: base.losses + botches };
}

export function getAdventureXp(baseDifficulty) {
  if (!Number.isFinite(baseDifficulty) || baseDifficulty < 0) throw new RangeError("Difficulty must be non-negative.");
  return Math.floor(baseDifficulty / 2) + 1;
}

export function getAdventureTime({ difficulty, challengeSets, failedRolls, botches, reducedTimeUses = 0 }) {
  const values = [difficulty, challengeSets, failedRolls, botches, reducedTimeUses];
  if (!values.every((value) => Number.isInteger(value) && value >= 0)) {
    throw new RangeError("Adventure time inputs must be non-negative integers.");
  }
  let days = difficulty + challengeSets + failedRolls + botches * 3;
  for (let index = 0; index < reducedTimeUses; index += 1) days = Math.max(1, Math.ceil(days / 2));
  return days;
}

export function getAdventureOrigin(roll) {
  return lookupRange(ADVENTURE_ORIGINS, roll);
}

export function getChallengeType(roll) {
  return lookupRange(CHALLENGE_TYPES, roll);
}

export function getTiming(simpleDie) {
  if (!Number.isInteger(simpleDie) || simpleDie < 1 || simpleDie > 10) {
    throw new RangeError("Timing requires a Simple Die result from 1 to 10.");
  }
  if (simpleDie <= 2) return { season: "spring", winterAdjustment: 0 };
  if (simpleDie <= 4) return { season: "summer", winterAdjustment: 0 };
  if (simpleDie <= 6) return { season: "autumn", winterAdjustment: 0 };
  if (simpleDie <= 8) return { season: "winter", winterAdjustment: 1 };
  return { season: null, winterAdjustment: 0, characterChoice: true };
}