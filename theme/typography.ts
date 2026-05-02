export const FONT_WEIGHTS = ['Inter_300Light', 'Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold', 'Inter_700Bold'] as const;

export type FontWeight = typeof FONT_WEIGHTS[number];
