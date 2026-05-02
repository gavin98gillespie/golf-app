import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

type Props = {
  rounds: number;
  avgScore: number | null;
  bestScore: number | null;
  bestDiff: number | null;
  trendDelta: number | null;
};

function formatTrend(delta: number | null): { label: string; tone: 'good' | 'bad' | 'neutral' } {
  if (delta == null) return { label: '—', tone: 'neutral' };
  if (delta < -0.5) return { label: `↓ ${Math.abs(delta).toFixed(1)}`, tone: 'good' };
  if (delta > 0.5) return { label: `↑ ${delta.toFixed(1)}`, tone: 'bad' };
  return { label: `±${Math.abs(delta).toFixed(1)}`, tone: 'neutral' };
}

export function StatsSummaryCard({ rounds, avgScore, bestScore, bestDiff, trendDelta }: Props) {
  const trend = formatTrend(trendDelta);
  const trendColor =
    trend.tone === 'good'
      ? 'text-accent'
      : trend.tone === 'bad'
        ? 'text-red-500'
        : 'text-text-secondary';

  return (
    <Pressable
      onPress={() => router.push('/stats')}
      className="bg-bg-surface border border-border-subtle rounded-2xl p-4 active:opacity-70"
    >
      <View className="flex-row justify-between mb-3">
        <View className="flex-1">
          <Text className="text-text-secondary text-[10px] uppercase tracking-wider">Rounds</Text>
          <Text className="text-text-primary text-2xl font-light mt-1">{rounds}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-text-secondary text-[10px] uppercase tracking-wider">Average</Text>
          <Text className="text-text-primary text-2xl font-light mt-1">{avgScore ?? '—'}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-text-secondary text-[10px] uppercase tracking-wider">Best</Text>
          <Text className="text-text-primary text-2xl font-light mt-1">{bestScore ?? '—'}</Text>
          {bestDiff != null ? (
            <Text className="text-text-secondary text-[10px]">
              {bestDiff >= 0 ? `+${bestDiff}` : bestDiff} vs par
            </Text>
          ) : null}
        </View>
      </View>
      <View className="flex-row justify-between items-center pt-3 border-t border-border-subtle">
        <View className="flex-row items-baseline gap-2">
          <Text className="text-text-secondary text-[10px] uppercase tracking-wider">
            Trend (last 5)
          </Text>
          <Text className={`text-sm font-semibold ${trendColor}`}>{trend.label}</Text>
        </View>
        <Text className="text-accent text-xs font-semibold">View detailed stats →</Text>
      </View>
    </Pressable>
  );
}
