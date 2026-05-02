import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import type { SummarySlice } from '@/lib/queries/stats';

type Props = {
  byHoleCount: Record<number, SummarySlice>;
  totalRounds: number;
};

function formatTrend(delta: number | null): { label: string; tone: 'good' | 'bad' | 'neutral' } {
  if (delta == null) return { label: '—', tone: 'neutral' };
  if (delta < -0.5) return { label: `↓ ${Math.abs(delta).toFixed(1)}`, tone: 'good' };
  if (delta > 0.5) return { label: `↑ ${delta.toFixed(1)}`, tone: 'bad' };
  return { label: `±${Math.abs(delta).toFixed(1)}`, tone: 'neutral' };
}

function SliceRow({ holeCount, slice }: { holeCount: number; slice: SummarySlice }) {
  const trend = formatTrend(slice.trendDelta);
  const trendColor =
    trend.tone === 'good'
      ? 'text-accent'
      : trend.tone === 'bad'
        ? 'text-red-500'
        : 'text-text-secondary';
  return (
    <View className="py-3 border-b border-border-subtle last:border-b-0">
      <Text className="text-text-secondary text-[10px] uppercase tracking-wider mb-2">
        {holeCount}-hole rounds
      </Text>
      <View className="flex-row justify-between">
        <View className="flex-1">
          <Text className="text-text-secondary text-[10px] uppercase tracking-wider">Rounds</Text>
          <Text className="text-text-primary text-2xl font-light mt-1">{slice.rounds}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-text-secondary text-[10px] uppercase tracking-wider">Average</Text>
          <Text className="text-text-primary text-2xl font-light mt-1">
            {slice.avgScore ?? '—'}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-text-secondary text-[10px] uppercase tracking-wider">Best</Text>
          <Text className="text-text-primary text-2xl font-light mt-1">
            {slice.bestScore ?? '—'}
          </Text>
          {slice.bestDiff != null ? (
            <Text className="text-text-secondary text-[10px]">
              {slice.bestDiff >= 0 ? `+${slice.bestDiff}` : slice.bestDiff} vs par
            </Text>
          ) : null}
        </View>
        <View className="flex-1">
          <Text className="text-text-secondary text-[10px] uppercase tracking-wider">Trend</Text>
          <Text className={`text-base font-semibold mt-1 ${trendColor}`}>{trend.label}</Text>
        </View>
      </View>
    </View>
  );
}

export function StatsSummaryCard({ byHoleCount, totalRounds }: Props) {
  // Order: 18-hole first (most common), then 9-hole, then anything else.
  const orderedKeys = Object.keys(byHoleCount)
    .map((k) => parseInt(k, 10))
    .sort((a, b) => {
      if (a === 18) return -1;
      if (b === 18) return 1;
      if (a === 9) return -1;
      if (b === 9) return 1;
      return a - b;
    });

  return (
    <Pressable
      onPress={() => router.push('/stats')}
      className="bg-bg-surface border border-border-subtle rounded-2xl px-4 active:opacity-70"
    >
      {totalRounds === 0 ? (
        <View className="py-6">
          <Text className="text-text-secondary text-sm text-center">
            No rounds yet. Score one to see your stats.
          </Text>
        </View>
      ) : (
        <>
          {orderedKeys.map((hc) => {
            const slice = byHoleCount[hc];
            if (!slice || slice.rounds === 0) return null;
            return <SliceRow key={hc} holeCount={hc} slice={slice} />;
          })}
          <View className="flex-row justify-end py-3">
            <Text className="text-accent text-xs font-semibold">View detailed stats →</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}
