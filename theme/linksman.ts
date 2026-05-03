// Linksman theme tokens. Single source of truth for color + type roles.
// See docs/design/linksman/brand-card.jsx for the brief.

export const palette = {
  ink: '#0E1410',
  bone: '#F4F0E6',
  fairway: '#2D4A36',
  sage: '#9BB89A',
  brass: '#B8924A',
  clay: '#B94A3B',
  graphite: '#1A2520',
} as const;

export const surface = {
  ink: { bg: palette.ink, fg: palette.bone, surface: palette.graphite, hairline: '#F4F0E61F' },
  bone: { bg: palette.bone, fg: palette.ink, surface: '#EAE4D2', hairline: '#0E14101F' },
} as const;

export type SurfaceMode = keyof typeof surface;

export function deltaColor(delta: number): string {
  if (delta <= -2) return palette.sage;
  if (delta === -1) return palette.sage;
  if (delta === 0) return palette.bone;
  if (delta === 1) return palette.bone;
  return palette.clay;
}

export function deltaLabel(delta: number, par?: number, score?: number): string {
  if (par === 3 && score === 1) return 'ACE';
  if (par != null && score != null && par - score >= 3) return 'ALB.';
  if (delta <= -2) return 'EAGLE';
  if (delta === -1) return 'BIRDIE';
  if (delta === 0) return 'PAR';
  if (delta === 1) return 'BOGEY';
  if (delta === 2) return 'DBL';
  return `+${delta}`;
}

export const fontFamily = {
  display: 'Fraunces_300Light',
  displayItalic: 'Fraunces_300Light_Italic',
  editorial: 'Fraunces_400Regular',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_600SemiBold',
} as const;
