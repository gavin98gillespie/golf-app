import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { startOfWeek, format, sub } from 'date-fns';

import { supabase } from '@/lib/supabase';
import { palette, fontFamily } from '@/theme/linksman';
import { Datum } from '@/components/Datum';

type Props = { userId: string };

type Row = { total_score: number; total_par: number; played_at: string };

export function WeeklySummary({ userId }: Props) {
  const thisStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const lastStart = format(
    sub(startOfWeek(new Date(), { weekStartsOn: 1 }), { weeks: 1 }),
    'yyyy-MM-dd',
  );

  const q = useQuery({
    queryKey: ['weekly_summary', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rounds')
        .select('total_score, total_par, played_at')
        .eq('user_id', userId)
        .eq('is_draft', false)
        .gte('played_at', lastStart)
        .order('played_at', { ascending: false });
      if (error) throw error;
      const all = (data ?? []) as Row[];
      const thisWeek = all.filter((r) => r.played_at >= thisStart);
      const lastWeek = all.filter((r) => r.played_at < thisStart && r.played_at >= lastStart);
      const avg = (rs: Row[]): number | null =>
        rs.length === 0
          ? null
          : rs.reduce((s, r) => s + (r.total_score - r.total_par), 0) / rs.length;
      return {
        thisCount: thisWeek.length,
        thisAvgDelta: avg(thisWeek),
        lastAvgDelta: avg(lastWeek),
      };
    },
    enabled: !!userId,
  });

  const data = q.data;
  if (!data) return null;
  const trend =
    data.thisAvgDelta != null && data.lastAvgDelta != null
      ? data.thisAvgDelta - data.lastAvgDelta
      : null;
  const trendLabel =
    trend == null
      ? '—'
      : trend < 0
        ? `↓ ${Math.abs(trend).toFixed(1)}`
        : trend > 0
          ? `↑ ${trend.toFixed(1)}`
          : '±0';
  const trendColor =
    trend == null ? palette.ink + '99' : trend < 0 ? palette.fairway : palette.clay;

  return (
    <View
      style={{
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: palette.ink + '33',
        paddingVertical: 16,
        marginTop: 24,
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
          marginBottom: 12,
        }}
      >
        This week
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Datum label="ROUNDS" value={data.thisCount} color={palette.ink} />
        <Datum
          label="AVG VS PAR"
          value={data.thisAvgDelta != null ? data.thisAvgDelta.toFixed(1) : '—'}
          color={palette.ink}
        />
        <Datum
          label="WK/WK"
          value={trendLabel}
          color={palette.ink}
          valueColor={trendColor}
          align="right"
        />
      </View>
    </View>
  );
}
