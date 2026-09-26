/** Combine live Skins with manual results once; settled ledger awards are not added again. */
export function roundBrassBalance(
  userId: string,
  skins: Record<string, number> | undefined,
  entries: readonly { from_player: string; to_player: string; amount: number }[],
): number {
  const manual = entries.reduce(
    (total, entry) =>
      total +
      (entry.to_player === userId ? entry.amount : 0) -
      (entry.from_player === userId ? entry.amount : 0),
    0,
  );
  return Math.round(((skins?.[userId] ?? 0) + manual) * 100) / 100;
}
