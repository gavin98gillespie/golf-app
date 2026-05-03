import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, getWeek } from 'date-fns';

import { ScreenContainer } from '@/components/ScreenContainer';
import { FeedRoundCard } from '@/components/FeedRoundCard';
import { GroupRoundCard } from '@/components/GroupRoundCard';
import { Wordmark } from '@/components/Wordmark';
import { Datum } from '@/components/Datum';
import { useSession } from '@/lib/hooks/useSession';
import { useDraftRound } from '@/lib/queries/rounds';
import { useFeed } from '@/lib/queries/feed';
import { palette, fontFamily } from '@/theme/linksman';
import { supabase, type Tables } from '@/lib/supabase';

export default function Feed() {
  const { session } = useSession();
  const userId = session?.user.id;

  const draftQ = useDraftRound(userId);
  const feedQ = useFeed(userId);
  const qc = useQueryClient();

  const courseQ = useQuery({
    queryKey: ['course', draftQ.data?.course_id],
    queryFn: async () => {
      if (!draftQ.data?.course_id) return null;
      const { data, error } = await supabase
        .from('courses')
        .select('name, hole_count')
        .eq('id', draftQ.data.course_id)
        .single();
      if (error) throw error;
      return data as Pick<Tables<'courses'>, 'name' | 'hole_count'>;
    },
    enabled: !!draftQ.data?.course_id,
  });

  const totalHoles = draftQ.data?.hole_count ?? courseQ.data?.hole_count ?? 18;
  const resumeQ = useQuery({
    queryKey: ['resume_hole', draftQ.data?.id, totalHoles],
    queryFn: async () => {
      if (!draftQ.data) return 1;
      const { data, error } = await supabase
        .from('round_holes')
        .select('hole_number')
        .eq('round_id', draftQ.data.id);
      if (error) throw error;
      const scored = new Set((data ?? []).map((r) => r.hole_number));
      for (let n = 1; n <= totalHoles; n++) if (!scored.has(n)) return n;
      return totalHoles;
    },
    enabled: !!draftQ.data,
  });

  const draft = draftQ.data;
  const feed = feedQ.data ?? [];
  const now = new Date();
  const weekNumber = getWeek(now);
  const monthYear = format(now, 'MMMM yyyy').toUpperCase();

  return (
    <ScreenContainer>
      <FlatList
        data={feed}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) =>
          userId ? (
            item.is_group ? (
              <GroupRoundCard round={item} viewerId={userId} />
            ) : (
              <FeedRoundCard round={item} viewerId={userId} />
            )
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Top bar — wordmark left, search/notif placeholders right */}
            <View
              style={{
                paddingTop: 8,
                paddingBottom: 14,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottomWidth: 0.5,
                borderBottomColor: palette.bone + '14',
              }}
            >
              <Wordmark size={22} color={palette.bone} />
            </View>

            {/* In-progress draft banner */}
            {draft && courseQ.data ? (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/round/new/score',
                    params: { roundId: draft.id, hole: String(resumeQ.data ?? 1) },
                  })
                }
                style={{
                  marginTop: 16,
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderWidth: 1,
                  borderColor: palette.brass,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.mono,
                    fontSize: 9,
                    letterSpacing: 9 * 0.2,
                    color: palette.brass,
                    textTransform: 'uppercase',
                  }}
                >
                  IN PROGRESS
                </Text>
                <Text
                  style={{
                    fontFamily: fontFamily.display,
                    fontSize: 18,
                    color: palette.bone,
                    marginTop: 4,
                  }}
                >
                  Resume at {courseQ.data.name}
                </Text>
                <Text
                  style={{
                    fontFamily: fontFamily.mono,
                    fontSize: 11,
                    color: palette.bone,
                    opacity: 0.6,
                    marginTop: 2,
                  }}
                >
                  Continue scoring at hole {resumeQ.data ?? 1}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Pressable
                    onPress={() => {
                      Alert.alert('Discard this round?', 'You will lose any scores entered.', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Discard',
                          style: 'destructive',
                          onPress: async () => {
                            await supabase.from('rounds').delete().eq('id', draft.id);
                            void qc.invalidateQueries({ queryKey: ['rounds', 'draft', userId] });
                            void qc.invalidateQueries({ queryKey: ['rounds'] });
                          },
                        },
                      ]);
                    }}
                    hitSlop={8}
                  >
                    <Text
                      style={{
                        fontFamily: fontFamily.mono,
                        fontSize: 10,
                        letterSpacing: 10 * 0.16,
                        color: palette.clay,
                        textTransform: 'uppercase',
                      }}
                    >
                      DISCARD
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            ) : null}

            {/* Section header */}
            <View
              style={{
                paddingTop: 24,
                paddingBottom: 10,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
              }}
            >
              <View>
                <Text
                  style={{
                    fontFamily: fontFamily.mono,
                    fontSize: 9,
                    letterSpacing: 9 * 0.2,
                    color: palette.bone,
                    opacity: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  WEEK {weekNumber} · {monthYear}
                </Text>
                <Text
                  style={{
                    fontFamily: fontFamily.display,
                    fontSize: 28,
                    letterSpacing: -28 * 0.02,
                    color: palette.bone,
                    marginTop: 4,
                  }}
                >
                  Friends on the course
                </Text>
              </View>
              <Datum label="ROUNDS" value={feed.length} color={palette.bone} align="right" />
            </View>
          </View>
        }
        ListEmptyComponent={
          feedQ.isLoading ? (
            <ActivityIndicator color={palette.bone} style={{ marginVertical: 24 }} />
          ) : (
            <View
              style={{
                marginTop: 12,
                paddingHorizontal: 20,
                paddingVertical: 18,
                borderWidth: 0.5,
                borderColor: palette.bone + '1F',
                borderRadius: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.display,
                  fontSize: 18,
                  color: palette.bone,
                }}
              >
                Your feed is quiet.
              </Text>
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 11,
                  color: palette.bone,
                  opacity: 0.6,
                  marginTop: 6,
                }}
              >
                Follow players from Discover. When you and someone follow each other, their rounds
                show up here.
              </Text>
            </View>
          )
        }
      />
    </ScreenContainer>
  );
}
