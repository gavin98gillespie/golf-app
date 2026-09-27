export type PhotoTarget = {
  roundId: string;
  kind: 'ace' | 'group';
  playerId?: string;
  hole?: number;
};
export function photoSlot(target: PhotoTarget) {
  if (target.kind === 'group') return 'group';
  if (!target.playerId || !Number.isInteger(target.hole) || target.hole! < 1 || target.hole! > 18)
    throw new Error('Invalid hole-in-one photo');
  return `${target.playerId}:${target.hole}`;
}
export function photoResize(width: number, height: number) {
  const ratio = Math.min(1, 1600 / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}
