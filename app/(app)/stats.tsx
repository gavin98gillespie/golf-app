import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ScoreTrendChart } from '@/components/ScoreTrendChart';
import { Datum } from '@/components/Datum';
import { useSession } from '@/lib/hooks/useSession';
import { useScoreTrend, useBestPerPar, type BestForPar } from '@/lib/queries/stats';
import { palette, fontFamily } from '@/theme/linksman';
import { parseLocalDate } from '@/lib/date';

export default function Stats() {
  const { session } = useSession();
  const trendQ = useScoreTrend(session?.user.id, { limit: 20, holeCount: 18 });
  const bestQ = useBestPerPar(session?.user.id);
  const { width } = useWindowDimensions();
  const chartWidth = width - 48;

  const bestPerPar = bestQ.data ?? { 3: null, 4: null, 5: null, 6: null };

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.back()} style={{ marginTop: 16 }} hitSlop={8}>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 11,
            letterSpacing: 11 * 0.16,
            color: palette.bone,
            opacity: 0.7,
            textTransform: 'uppercase',
          }}
        >
          ← BACK
        </Text>
      </Pressable>

      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 9 * 0.2,
          color: palette.bone,
          opacity: 0.5,
          textTransform: 'uppercase',
          marginTop: 16,
        }}
      >
        Statistics
      </Text>
      <Text
        style={{
          fontFamily: fontFamily.display,
          fontSize: 36,
          letterSpacing: -36 * 0.02,
          color: palette.bone,
          marginTop: 4,
          marginBottom: 24,
        }}
      >
        Your stats
      </Text>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.2,
            color: palette.bone,
            opacity: 0.55,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Score trend · 18-hole rounds
        </Text>
        <ScoreTrendChart points={trendQ.data ?? []} width={chartWidth} height={180} />

        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.2,
            color: palette.bone,
            opacity: 0.55,
            textTransform: 'uppercase',
            marginTop: 32,
            marginBottom: 12,
          }}
        >
          Best per hole type
        </Text>

        <View style={{ gap: 12, paddingBottom: 40 }}>
          {([3, 4, 5, 6] as const)
            .filter((par) => par !== 6 || bestPerPar[6] != null)
            .map((par) => (
              <BestParCell key={par} par={par} best={bestPerPar[par] ?? null} />
            ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function diffLabel(score: number, par: number): string {
  const diff = score - par;
  if (diff < -2) return `${diff}`;
  if (diff === -2) return 'EAGLE';
  if (diff === -1) return 'BIRDIE';
  if (diff === 0) return 'PAR';
  if (diff === 1) return 'BOGEY';
  return `+${diff}`;
}

function BestParCell({ par, best }: { par: number; best: BestForPar }) {
  if (best == null) {
    return (
      <View
        style={{
          borderTopWidth: 0.5,
          borderBottomWidth: 0.5,
          borderColor: palette.bone + '33',
          paddingVertical: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Datum label={`PAR ${par}`} value="—" color={palette.bone} />
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 10,
            letterSpacing: 10 * 0.16,
            color: palette.bone,
            opacity: 0.45,
            textTransform: 'uppercase',
          }}
        >
          No data
        </Text>
      </View>
    );
  }

  const dateStr = format(parseLocalDate(best.played_at), 'MMM d, yyyy').toUpperCase();
  return (
    <Pressable
      onPress={() => router.push(`/round/${best.round_id}`)}
      style={{
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: palette.bone + '33',
        paddingVertical: 16,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Datum label={`PAR ${par}`} value={best.score} color={palette.bone} />
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 11,
            letterSpacing: 11 * 0.16,
            color: palette.brass,
            textTransform: 'uppercase',
          }}
        >
          {diffLabel(best.score, par)}
        </Text>
      </View>
      <View style={{ marginTop: 8 }}>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 16,
            color: palette.bone,
          }}
          numberOfLines={1}
        >
          {best.course_name}
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 10,
            letterSpacing: 10 * 0.16,
            color: palette.bone,
            opacity: 0.55,
            marginTop: 2,
            textTransform: 'uppercase',
          }}
        >
          {dateStr}
        </Text>
      </View>
    </Pressable>
  );
}
