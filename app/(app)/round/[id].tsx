import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenContainer } from '@/components/ScreenContainer';
import { HoleScoreGrid } from '@/components/HoleScoreGrid';
import { LikeButton } from '@/components/LikeButton';
import { CommentList } from '@/components/CommentList';
import { CommentInput } from '@/components/CommentInput';
import { ReportSheet } from '@/components/ReportSheet';
import { useRoundHoles } from '@/lib/queries/rounds';
import { useComments } from '@/lib/queries/comments';
import { useSession } from '@/lib/hooks/useSession';
import type { ReportTargetType } from '@/lib/queries/reports';
import { supabase, type Tables } from '@/lib/supabase';
import { parseLocalDate } from '@/lib/date';

type RoundWithCourse = Tables<'rounds'> & {
  courses: Pick<Tables<'courses'>, 'name' | 'hole_count' | 'city' | 'state'> | null;
};

export default function RoundDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const insets = useSafeAreaInsets();

  const roundQ = useQuery({
    queryKey: ['round', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('rounds')
        .select('*, courses(name, hole_count, city, state)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as RoundWithCourse;
    },
    enabled: !!id,
  });

  const holesQ = useRoundHoles(id);

  const round = roundQ.data;
  const isOwner = !!session?.user.id && round?.user_id === session.user.id;

  const commentsQ = useComments(round?.id);
  const comments = commentsQ.data ?? [];
  const viewerId = session?.user.id;

  const [reportTarget, setReportTarget] = useState<{ type: ReportTargetType; id: string } | null>(
    null,
  );

  const onTapMore = () => {
    if (!viewerId || !round) return;
    Alert.alert('Options', undefined, [
      {
        text: 'Report this round',
        onPress: () => setReportTarget({ type: 'round', id: round.id }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const totals = useMemo(() => {
    const scored = holesQ.data ?? [];
    const score = scored.reduce((a, h) => a + h.score, 0);
    const par = scored.reduce((a, h) => a + h.par, 0);
    return { score, par, diff: score - par };
  }, [holesQ.data]);

  if (!round) {
    return (
      <ScreenContainer>
        <Text className="text-text-secondary mt-12">Loading...</Text>
      </ScreenContainer>
    );
  }

  const totalHoles = round.courses?.hole_count ?? 18;
  const dateStr = format(parseLocalDate(round.played_at), 'MMMM d, yyyy');

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ paddingBottom: 40 }}
          className="flex-1"
        >
          <View className="flex-row justify-between items-center mt-4 mb-2">
            <Pressable onPress={() => router.back()} className="active:opacity-70">
              <Text className="text-text-secondary text-sm">← Back</Text>
            </Pressable>
            {viewerId ? (
              <Pressable onPress={onTapMore} className="p-2 active:opacity-70">
                <Text className="text-text-secondary text-base">•••</Text>
              </Pressable>
            ) : null}
          </View>

          {!isOwner && round.user_id ? <RoundOwnerHeader ownerId={round.user_id} /> : null}

          <Text className="text-text-secondary text-xs uppercase tracking-wider mt-2">
            {dateStr}
          </Text>
          <Pressable
            onPress={() =>
              round.course_id ? router.push(`/course/${round.course_id}`) : undefined
            }
            className="active:opacity-70"
          >
            <Text className="text-text-primary text-3xl font-light mt-1 mb-1">
              {round.courses?.name ?? 'Round'}
            </Text>
            <Text className="text-accent text-xs uppercase tracking-wider mb-4">View course →</Text>
          </Pressable>

          <View className="bg-bg-surface border border-border-subtle rounded-2xl p-5 mb-4">
            <Text
              style={{ fontSize: 64 }}
              className="text-accent font-light tracking-tight leading-none"
            >
              {totals.score}
            </Text>
            <Text className="text-text-secondary text-sm mt-2">
              {totals.diff >= 0 ? `+${totals.diff}` : totals.diff} · {totalHoles} holes · Par{' '}
              {totals.par}
            </Text>
          </View>

          <View className="bg-bg-surface border border-border-subtle rounded-2xl p-4 mb-4">
            <Text className="text-text-secondary text-xs uppercase tracking-wider mb-3">Holes</Text>
            <HoleScoreGrid holes={holesQ.data ?? []} totalHoles={totalHoles} />
          </View>

          {viewerId && round ? (
            <View className="mt-6">
              <View className="flex-row items-center">
                <LikeButton viewerId={viewerId} roundId={round.id} />
                <Text className="text-text-secondary text-sm ml-4">💬 {comments.length}</Text>
              </View>

              <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-4 mb-1">
                Comments
              </Text>
              <CommentList comments={comments} />
            </View>
          ) : null}
        </ScrollView>

        {viewerId && round ? (
          <View
            className="border-t border-border-subtle bg-bg-base"
            style={{ paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8) }}
          >
            <CommentInput viewerId={viewerId} roundId={round.id} />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {viewerId && reportTarget ? (
        <ReportSheet
          visible
          reporterId={viewerId}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          onClose={() => setReportTarget(null)}
        />
      ) : null}
    </ScreenContainer>
  );
}

function RoundOwnerHeader({ ownerId }: { ownerId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['profile', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .eq('id', ownerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (isLoading || !data) return null;
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/profile/[username]', params: { username: data.username } })
      }
      className="flex-row items-center py-3 active:opacity-70"
    >
      <View className="w-10 h-10 rounded-full bg-bg-surface border border-border-subtle items-center justify-center">
        <Text className="text-text-secondary text-base font-semibold">
          {data.display_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="ml-3">
        <Text className="text-text-primary text-base font-semibold">{data.display_name}</Text>
        <Text className="text-text-secondary text-xs">@{data.username}</Text>
      </View>
    </Pressable>
  );
}
