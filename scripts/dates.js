const SEASONS = ["spring", "summer", "autumn", "winter"];

export function normalizeDate(date) {
  if (!Number.isInteger(date?.year) || !SEASONS.includes(date?.season)) {
    throw new RangeError("A date requires an integer year and a valid season.");
  }
  return { year: date.year, season: date.season };
}

export function getCrossedDates(previousDate, targetDate) {
  const previous = normalizeDate(previousDate);
  const target = normalizeDate(targetDate);
  const previousIndex = previous.year * SEASONS.length + SEASONS.indexOf(previous.season);
  const targetIndex = target.year * SEASONS.length + SEASONS.indexOf(target.season);
  if (targetIndex <= previousIndex) return [];
  return Array.from({ length: targetIndex - previousIndex }, (_, index) => {
    const seasonIndex = previousIndex + index + 1;
    return {
      year: Math.floor(seasonIndex / SEASONS.length),
      season: SEASONS[seasonIndex % SEASONS.length]
    };
  });
}