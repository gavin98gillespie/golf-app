import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme';

type Props = {
  score: number;
  par: number;
  onChange: (next: number) => void;
};

export function ScoreStepper({ score, par, onChange }: Props) {
  const diff = score - par;
  const diffLabel =
    diff === 0
      ? 'Par'
      : diff < 0
        ? diff === -1
          ? 'Birdie (-1)'
          : diff === -2
            ? 'Eagle (-2)'
            : `${diff}`
        : diff === 1
          ? 'Bogey (+1)'
          : `+${diff}`;

  return (
    <View className="bg-bg-surface border border-border-subtle rounded-2xl py-5 px-4 items-center">
      <Text className="text-text-secondary text-xs uppercase tracking-wider mb-3">Your score</Text>
      <View className="flex-row items-center gap-6">
        <Pressable
          onPress={() => onChange(Math.max(1, score - 1))}
          className="w-10 h-10 rounded-full bg-border-subtle items-center justify-center active:opacity-60"
          accessibilityLabel="Decrement score"
        >
          <Text className="text-text-primary text-xl">−</Text>
        </Pressable>
        <Text style={{ color: colors.accent }} className="text-6xl font-light tracking-tight">
          {score}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(20, score + 1))}
          className="w-10 h-10 rounded-full bg-border-subtle items-center justify-center active:opacity-60"
          accessibilityLabel="Increment score"
        >
          <Text className="text-accent text-xl">+</Text>
        </Pressable>
      </View>
      <Text className="text-text-secondary text-sm mt-2">{diffLabel}</Text>
    </View>
  );
}
