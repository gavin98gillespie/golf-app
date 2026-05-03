import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';

import { palette, fontFamily } from '@/theme/linksman';
import { parseLocalDate } from '@/lib/date';
import type { RegularsPulse } from '@/lib/queries/today';

type Props = { pulse: RegularsPulse | null | undefined };

export function RegularsPulseCard({ pulse }: Props) {
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
        FROM YOUR REGULARS
      </Text>
      {pulse ? (
        <Pressable
          onPress={() =>
            router.push({ pathname: '/round/[id]', params: { id: pulse.round.id } })
          }
        >
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 22,
              color: palette.ink,
              lineHeight: 22 * 1.2,
            }}
          >
            {pulse.owner?.display_name ?? '—'} · {pulse.round.courses?.name ?? 'Unknown course'}
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 12,
              color: palette.ink,
              opacity: 0.6,
              marginTop: 6,
            }}
          >
            {pulse.round.total_score} (
            {pulse.round.total_score - pulse.round.total_par >= 0 ? '+' : ''}
            {pulse.round.total_score - pulse.round.total_par}) ·{' '}
            {format(parseLocalDate(pulse.round.played_at), 'MMM d').toUpperCase()}
          </Text>
        </Pressable>
      ) : (
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 22,
            color: palette.ink,
            opacity: 0.7,
            lineHeight: 22 * 1.3,
          }}
        >
          Quiet on the wire.
        </Text>
      )}
    </View>
  );
}
