import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { useCreateGroupRound } from '@/lib/queries/groupRounds';
import { useSession } from '@/lib/hooks/useSession';
import { supabase, type Tables } from '@/lib/supabase';
import { palette, fontFamily } from '@/theme/linksman';

export default function GroupSetup() {
  const params = useLocalSearchParams<{ courseId?: string }>();
  const courseId = params.courseId;
  const { session } = useSession();
  const [teeBox, setTeeBox] = useState('white');
  const [holeCount, setHoleCount] = useState<9 | 18>(18);
  const [liveVisible, setLiveVisible] = useState(false);
  const create = useCreateGroupRound();

  const courseQ = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();
      if (error) throw error;
      return data as Tables<'courses'> | null;
    },
    enabled: !!courseId,
  });

  // If no course chosen yet, send to picker
  useEffect(() => {
    if (!courseId) {
      router.replace('/round/new/course?mode=groupRoundSelect');
    }
  }, [courseId]);

  if (!courseId) return null;

  const onCreate = async () => {
    if (!session?.user.id) return;
    const round = await create.mutateAsync({
      hostId: session.user.id,
      course_id: courseId,
      tee_box: teeBox,
      hole_count: holeCount,
      live_visible: liveVisible,
      played_at: new Date().toISOString().slice(0, 10),
    });
    router.replace(`/round/group/${round.id}/lobby` as never);
  };

  return (
    <ScreenContainer surface="bone">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ paddingTop: 8, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Wordmark size={20} color={palette.ink} />
          <Pressable onPress={() => router.replace('/(app)/(tabs)')} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 11 * 0.16, color: palette.ink, opacity: 0.6, textTransform: 'uppercase' }}>
              CANCEL
            </Text>
          </Pressable>
        </View>

        <Text style={{ fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 9 * 0.2, color: palette.ink, opacity: 0.5, textTransform: 'uppercase', marginTop: 16 }}>
          GROUP ROUND
        </Text>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 36, color: palette.ink, marginTop: 4 }}>
          {courseQ.data?.name ?? '...'}
        </Text>

        {/* Tee */}
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 9 * 0.2, color: palette.ink, opacity: 0.55, textTransform: 'uppercase', marginTop: 32 }}>
          YOUR TEE
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {(['black','blue','white','gold','red'] as const).map((t) => {
            const active = t === teeBox;
            return (
              <Pressable key={t} onPress={() => setTeeBox(t)} style={{
                paddingVertical: 10, paddingHorizontal: 14,
                borderWidth: 0.5, borderColor: active ? palette.fairway : palette.ink + '33',
                backgroundColor: active ? palette.fairway + '11' : 'transparent',
              }}>
                <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 11 * 0.16, color: active ? palette.fairway : palette.ink, textTransform: 'uppercase' }}>
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Hole count */}
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 9 * 0.2, color: palette.ink, opacity: 0.55, textTransform: 'uppercase', marginTop: 24 }}>
          LENGTH
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {([9, 18] as const).map((hc) => {
            const active = holeCount === hc;
            return (
              <Pressable key={hc} onPress={() => setHoleCount(hc)} style={{
                paddingVertical: 10, paddingHorizontal: 18,
                borderWidth: 0.5, borderColor: active ? palette.fairway : palette.ink + '33',
                backgroundColor: active ? palette.fairway + '11' : 'transparent',
              }}>
                <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, color: active ? palette.fairway : palette.ink }}>
                  {hc} HOLES
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Live visible toggle */}
        <View style={{ marginTop: 32, paddingVertical: 14, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: palette.ink + '33', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontFamily: fontFamily.display, fontSize: 18, color: palette.ink }}>
              Live to friends
            </Text>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.ink, opacity: 0.55, marginTop: 4 }}>
              On: friends of any player see the round on their feed during play. Off: round appears only when everyone finishes.
            </Text>
          </View>
          <Switch value={liveVisible} onValueChange={setLiveVisible} />
        </View>

        <Pressable
          onPress={onCreate}
          disabled={create.isPending}
          style={{ marginTop: 32, backgroundColor: palette.brass, paddingVertical: 16, alignItems: 'center', opacity: create.isPending ? 0.5 : 1 }}
        >
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 13, letterSpacing: 13 * 0.18, color: palette.ink, textTransform: 'uppercase' }}>
            CREATE ROUND →
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
