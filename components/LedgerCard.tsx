import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';

import { palette, fontFamily } from '@/theme/linksman';
import { parseLocalDate } from '@/lib/date';
import type { TodayRoundSummary } from '@/lib/queries/today';

type Props = {
  best: TodayRoundSummary | null | undefined;
  latest: TodayRoundSummary | null | undefined;
  achievementsCount: number | undefined;
};

export function LedgerCard({ best, latest, achievementsCount }: Props) {
  const trophyCount = achievementsCount ?? 0;
  const hasAny = !!best || !!latest || trophyCount > 0;

  if (!hasAny) {
    return (
      <View style={{ paddingVertical: 24, borderTopWidth: 0.5, borderColor: palette.ink + '22' }}>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.2,
            color: palette.ink,
            opacity: 0.55,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          FROM YOUR LEDGER
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 24,
            color: palette.ink,
            opacity: 0.7,
            lineHeight: 24 * 1.3,
          }}
        >
          Your first card will live here.
        </Text>
      </View>
    );
  }

  const row = (label: string, value: string, onPress?: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingVertical: 14,
        borderTopWidth: 0.5,
        borderColor: palette.ink + '22',
      }}
    >
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 9 * 0.2,
          color: palette.ink,
          opacity: 0.55,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text style={{ fontFamily: fontFamily.display, fontSize: 18, color: palette.ink }}>
        {value}
      </Text>
    </Pressable>
  );

  const fmtCard = (r: TodayRoundSummary) => {
    const diff = r.total_score - r.total_par;
    const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
    return `${r.total_score}  ${diffLabel}`;
  };

  return (
    <View style={{ paddingVertical: 24, borderTopWidth: 0.5, borderColor: palette.ink + '22' }}>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 9 * 0.2,
          color: palette.ink,
          opacity: 0.55,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        FROM YOUR LEDGER
      </Text>
      {row(
        'BEST CARD',
        best ? fmtCard(best) : 'No card yet',
        best ? () => router.push({ pathname: '/round/[id]', params: { id: best.id } }) : undefined,
      )}
      {row(
        'LAST CARD',
        latest
          ? `${fmtCard(latest)}  ·  ${format(parseLocalDate(latest.played_at), 'MMM d').toUpperCase()}`
          : 'No card yet',
        latest
          ? () => router.push({ pathname: '/round/[id]', params: { id: latest.id } })
          : undefined,
      )}
      {row(
        'TROPHY CASE',
        trophyCount > 0 ? `${trophyCount}` : 'Nothing yet — play a round.',
        trophyCount > 0 ? () => router.push('/achievements') : undefined,
      )}
    </View>
  );
}
