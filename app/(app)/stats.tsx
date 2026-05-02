import { Pressable, ScrollView, Text, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ScoreTrendChart } from '@/components/ScoreTrendChart';
import { BestPerParRow } from '@/components/BestPerParRow';
import { useSession } from '@/lib/hooks/useSession';
import { useScoreTrend, useBestPerPar } from '@/lib/queries/stats';

export default function Stats() {
  const { session } = useSession();
  const trendQ = useScoreTrend(session?.user.id, 20);
  const bestQ = useBestPerPar(session?.user.id);
  const { width } = useWindowDimensions();
  const chartWidth = width - 48; // matches ScreenContainer's px-6 padding (24px each side)

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.back()} className="mt-4 mb-2">
        <Text className="text-text-secondary text-sm">← Back</Text>
      </Pressable>
      <Text className="text-text-primary text-3xl font-light tracking-tight mb-6">Your stats</Text>

      <ScrollView className="flex-1">
        <Text className="text-text-secondary text-xs uppercase tracking-wider mb-2">
          Score trend
        </Text>
        <ScoreTrendChart points={trendQ.data ?? []} width={chartWidth} height={180} />

        <Text className="text-text-secondary text-xs uppercase tracking-wider mt-6 mb-2">
          Best per hole type
        </Text>
        <BestPerParRow bestPerPar={bestQ.data ?? { 3: null, 4: null, 5: null, 6: null }} />
      </ScrollView>
    </ScreenContainer>
  );
}
