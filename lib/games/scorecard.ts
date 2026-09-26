export function scorecardTotals(
  hole: number,
  score: number,
  par: number,
  totalHoles: number,
  played: readonly { hole_number: number; score: number; par: number }[],
  course: readonly { hole_number: number; par: number }[],
) {
  const prior = played.filter((entry) => entry.hole_number < hole);
  const totalScore = prior.reduce((sum, entry) => sum + entry.score, 0) + score;
  const totalPar = prior.reduce((sum, entry) => sum + entry.par, 0) + par;
  const diff = totalScore - totalPar;
  const coursePar = Array.from({ length: totalHoles }, (_, i) => i + 1).reduce(
    (sum, number) =>
      sum +
      (number === hole
        ? par
        : (played.find((entry) => entry.hole_number === number)?.par ??
          course.find((entry) => entry.hole_number === number)?.par ??
          4)),
    0,
  );
  return {
    thru: hole,
    totalScore,
    vsPar: diff === 0 ? 'E' : diff > 0 ? `+${diff}` : String(diff),
    projected: coursePar + diff,
  };
}
/** A missing player must be scored before advancing the hole. */
export function nextUnscoredPlayer(
  players: readonly string[],
  current: string,
  recorded: ReadonlySet<string>,
): string | undefined {
  const index = players.indexOf(current);
  const ordered = [...players.slice(index + 1), ...players.slice(0, index)];
  return ordered.find((id) => !recorded.has(id));
}
