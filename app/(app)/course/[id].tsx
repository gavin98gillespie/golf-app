import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Topo } from '@/components/Topo';
import { Datum } from '@/components/Datum';
import { useSession } from '@/lib/hooks/useSession';
import { useUserRoundsAtCourse } from '@/lib/queries/stats';
import { supabase, type Tables } from '@/lib/supabase';
import { parseLocalDate } from '@/lib/date';
import { palette, fontFamily } from '@/theme/linksman';

type Round = Tables<'rounds'>;

export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const { width: windowWidth } = useWindowDimensions();

  const courseQ = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('courses').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Tables<'courses'>;
    },
    enabled: !!id,
  });

  const roundsQ = useUserRoundsAtCourse(session?.user.id, id);

  const stats = useMemo(() => {
    const rounds = roundsQ.data ?? [];
    if (rounds.length === 0) return null;
    const scores = rounds.map((r) => r.total_score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return {
      played: rounds.length,
      best: Math.min(...scores),
      average: avg,
    };
  }, [roundsQ.data]);

  if (!courseQ.data) {
    return (
      <ScreenContainer surface="bone">
        <ActivityIndicator color={palette.ink} style={{ marginTop: 24 }} />
      </ScreenContainer>
    );
  }

  const course = courseQ.data;
  const rounds: Round[] = roundsQ.data ?? [];
  const subtitle = [course.city, course.state].filter(Boolean).join(', ');
  const topoHeight = 220;

  return (
    <ScreenContainer surface="bone">
      <FlatList<Round>
        data={rounds}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={{ paddingTop: 8, paddingBottom: 4 }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 11,
                  letterSpacing: 11 * 0.16,
                  color: palette.ink,
                  opacity: 0.7,
                  textTransform: 'uppercase',
                }}
              >
                ← BACK
              </Text>
            </Pressable>

            <View
              style={{
                marginTop: 12,
                height: topoHeight,
                marginHorizontal: -24,
                overflow: 'hidden',
                backgroundColor: palette.ink,
              }}
            >
              <Topo
                seed={course.id ?? id ?? 'course'}
                width={windowWidth}
                height={topoHeight}
                stroke={palette.bone + '22'}
                strokeBold={palette.bone + '40'}
                greenColor={palette.fairway + '55'}
                jitter={0.22}
                showPin
                pinColor={palette.sage}
              />
            </View>

            <Text
              style={{
                fontFamily: fontFamily.display,
                fontSize: 36,
                letterSpacing: -36 * 0.02,
                color: palette.ink,
                marginTop: 24,
                lineHeight: 36 * 1.05,
              }}
            >
              {course.name}
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                letterSpacing: 11 * 0.16,
                color: palette.ink,
                opacity: 0.55,
                marginTop: 4,
                textTransform: 'uppercase',
              }}
            >
              {subtitle || 'Location unknown'}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                marginTop: 24,
                paddingVertical: 16,
                borderTopWidth: 0.5,
                borderBottomWidth: 0.5,
                borderColor: palette.ink + '33',
              }}
            >
              <View style={{ flex: 1 }}>
                <Datum label="ROUNDS" value={stats?.played ?? 0} color={palette.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Datum label="BEST" value={stats?.best ?? '—'} color={palette.ink} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Datum
                  label="AVG"
                  value={stats?.average != null ? stats.average.toFixed(1) : '—'}
                  color={palette.ink}
                  align="right"
                />
              </View>
            </View>

            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 9,
                letterSpacing: 9 * 0.2,
                color: palette.ink,
                opacity: 0.55,
                marginTop: 24,
                marginBottom: 8,
                textTransform: 'uppercase',
              }}
            >
              Your rounds
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const diff = item.total_score - item.total_par;
          const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
          return (
            <Pressable
              onPress={() => router.push(`/round/${item.id}`)}
              style={{
                flexDirection: 'row',
                paddingVertical: 14,
                borderBottomWidth: 0.5,
                borderBottomColor: palette.ink + '20',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: fontFamily.mono,
                    fontSize: 11,
                    letterSpacing: 11 * 0.16,
                    color: palette.ink,
                    opacity: 0.7,
                    textTransform: 'uppercase',
                  }}
                >
                  {format(parseLocalDate(item.played_at), 'MMM d, yyyy').toUpperCase()}
                </Text>
              </View>
              <Text style={{ fontFamily: fontFamily.display, fontSize: 22, color: palette.ink }}>
                {item.total_score}
              </Text>
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 11,
                  color: palette.ink,
                  opacity: 0.6,
                  marginLeft: 8,
                  width: 32,
                  textAlign: 'right',
                }}
              >
                {diffLabel}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              color: palette.ink,
              opacity: 0.55,
              marginTop: 12,
            }}
          >
            No rounds here yet.
          </Text>
        }
      />
    </ScreenContainer>
  );
}
