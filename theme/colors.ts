export const colors = {
  bg: {
    base: '#08100c',
    surface: '#0f1814',
    elevated: '#0a120e',
  },
  border: {
    subtle: '#1c2a23',
  },
  text: {
    primary: '#f0efe8',
    secondary: '#7a8a82',
    muted: '#4a5a52',
  },
  accent: '#4ade80',
  accentSoft: 'rgba(74, 222, 128, 0.06)',
  accentBorder: 'rgba(74, 222, 128, 0.4)',
} as const;

export type Colors = typeof colors;
