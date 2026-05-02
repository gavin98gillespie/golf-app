import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';

import type { BestForPar } from '@/lib/queries/stats';
import { parseLocalDate } from '@/lib/date';

type Props = {
  bestPerPar: Record<number, BestForPar>;
};

function diffLabel(score: number, par: number): string {
  const diff = score - par;
  if (diff < -2) return `${diff}`;
  if (diff === -2) return 'Eagle';
  if (diff === -1) return 'Birdie';
  if (diff === 0) return 'Par';
  if (diff === 1) return 'Bogey';
  return `+${diff}`;
}

export function BestPerParRow({ bestPerPar }: Props) {
  const cells: { par: number; label: string }[] = [
    { par: 3, label: 'Par 3' },
    { par: 4, label: 'Par 4' },
    { par: 5, label: 'Par 5' },
  ];
  if (bestPerPar[6] != null) cells.push({ par: 6, label: 'Par 6' });

  return (
    <View className="gap-3">
      {cells.map(({ par, label }) => {
        const best = bestPerPar[par];
        if (best == null) {
          return (
            <View key={par} className="bg-bg-surface border border-border-subtle rounded-2xl p-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-text-secondary text-[10px] uppercase tracking-wider">
                  {label}
                </Text>
                <Text className="text-text-secondary text-xs">No data</Text>
              </View>
              <Text className="text-text-muted text-3xl font-light mt-2">—</Text>
            </View>
          );
        }
        const dateStr = format(parseLocalDate(best.played_at), 'MMM d, yyyy');
        return (
          <Pressable
            key={par}
            onPress={() => router.push(`/round/${best.round_id}`)}
            className="bg-bg-surface border border-border-subtle rounded-2xl p-4 active:opacity-70"
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-text-secondary text-[10px] uppercase tracking-wider">
                {label}
              </Text>
              <Text className="text-accent text-xs font-semibold">
                {diffLabel(best.score, par)}
              </Text>
            </View>
            <View className="flex-row items-baseline mt-2 gap-3">
              <Text className="text-text-primary text-3xl font-light">{best.score}</Text>
              <View className="flex-1">
                <Text className="text-text-primary text-sm" numberOfLines={1}>
                  {best.course_name}
                </Text>
                <Text className="text-text-secondary text-xs">{dateStr}</Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
