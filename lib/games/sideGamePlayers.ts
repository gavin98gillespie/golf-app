export function payerForWinner(
  players: readonly string[],
  winner: string,
  currentPayer: string,
): string {
  if (!players.includes(winner)) return '';
  if (players.length === 2) return players.find((id) => id !== winner) ?? '';
  return currentPayer !== winner && players.includes(currentPayer) ? currentPayer : '';
}
