import { Text, View } from 'react-native';

import { colors } from '@/theme';

type Props = {
  current: number;
  total: number;
  runningScore: number;
  runningDiff: number;
};

export function HoleProgressBar({ current, total, runningScore, runningDiff }: Props) {
  const pct = (current / total) * 100;
  return (
    <View>
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-text-secondary text-xs uppercase tracking-wider">
          Hole {current} of {total}
        </Text>
        <Text className="text-accent text-xs font-semibold">
          Total: {runningScore} ({runningDiff >= 0 ? `+${runningDiff}` : runningDiff})
        </Text>
      </View>
      <View className="h-1 bg-border-subtle rounded-full">
        <View
          style={{ width: `${pct}%`, backgroundColor: colors.accent }}
          className="h-1 rounded-full"
        />
      </View>
    </View>
  );
}
