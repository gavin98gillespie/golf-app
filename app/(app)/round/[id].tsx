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
import { HoleGrid } from '@/components/HoleGrid';
import { ScoreNumeral } from '@/components/ScoreNumeral';
import { MonoBadge } from '@/components/MonoBadge';
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
import { palette, fontFamily } from '@/theme/linksman';

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

  const roundHolesQ = useRoundHoles(id);

  const round = roundQ.data;
  const isOwner = !!session?.user.id && round?.user_id === session.user.id;

  const ownerProfileQ = useQuery({
    queryKey: ['profile', round?.user_id],
    queryFn: async () => {
      if (!round?.user_id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .eq('id', round.user_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!round?.user_id,
  });
  const ownerProfile = ownerProfileQ.data;

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

  const holeRows = useMemo(
    () =>
      (roundHolesQ.data ?? [])
        .slice()
        .sort((a, b) => a.hole_number - b.hole_number)
        .map((h) => ({ score: h.score, par: h.par, delta: h.score - h.par })),
    [roundHolesQ.data],
  );

  if (!round) {
    return (
      <ScreenContainer>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 11,
            color: palette.bone,
            opacity: 0.6,
            marginTop: 48,
          }}
        >
          Loading...
        </Text>
      </ScreenContainer>
    );
  }

  const courseName = round.courses?.name ?? null;
  const courseHoleCount = round.courses?.hole_count ?? null;
  const totalDelta = round.total_score - round.total_par;
  const deltaColor =
    totalDelta <= -2
      ? palette.brass
      : totalDelta < 0
        ? palette.brass
        : totalDelta > 3
          ? palette.clay
          : palette.bone + '99';

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ paddingBottom: 40 }}
          style={{ flex: 1 }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 11,
                  letterSpacing: 11 * 0.18,
                  color: palette.bone,
                  opacity: 0.7,
                  textTransform: 'uppercase',
                }}
              >
                ‹ BACK
              </Text>
            </Pressable>
            {viewerId ? (
              <Pressable onPress={onTapMore} hitSlop={8} style={{ padding: 8 }}>
                <Text
                  style={{
                    fontFamily: fontFamily.mono,
                    fontSize: 16,
                    color: palette.bone,
                    opacity: 0.7,
                  }}
                >
                  •••
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Owner row — small avatar + name + handle */}
          {!isOwner && round?.user_id ? (
            <Pressable
              onPress={() =>
                ownerProfile?.username
                  ? router.push({
                      pathname: '/profile/[username]',
                      params: { username: ownerProfile.username },
                    })
                  : null
              }
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: palette.graphite,
                  borderWidth: 0.5,
                  borderColor: palette.bone + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: fontFamily.display, fontSize: 18, color: palette.bone }}>
                  {(ownerProfile?.display_name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={{ fontFamily: fontFamily.display, fontSize: 17, color: palette.bone }}>
                  {ownerProfile?.display_name ?? 'Unknown'}
                </Text>
                <Text
                  style={{
                    fontFamily: fontFamily.mono,
                    fontSize: 11,
                    color: palette.bone,
                    opacity: 0.6,
                  }}
                >
                  @{ownerProfile?.username ?? '—'}
                </Text>
              </View>
            </Pressable>
          ) : null}

          {/* Date + course */}
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              letterSpacing: 11 * 0.18,
              color: palette.bone,
              opacity: 0.5,
              textTransform: 'uppercase',
              marginTop: 24,
            }}
          >
            {format(parseLocalDate(round.played_at), 'MMM d, yyyy').toUpperCase()}
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 36,
              letterSpacing: -36 * 0.02,
              color: palette.bone,
              marginTop: 4,
              lineHeight: 36 * 1.05,
            }}
          >
            {courseName ?? 'Unknown course'}
          </Text>
          {round.course_id ? (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/course/[id]', params: { id: round.course_id! } })
              }
              style={{ marginTop: 6 }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 11,
                  letterSpacing: 11 * 0.18,
                  color: palette.sage,
                  textTransform: 'uppercase',
                }}
              >
                VIEW COURSE →
              </Text>
            </Pressable>
          ) : null}

          {/* Score block */}
          <View
            style={{
              marginTop: 24,
              backgroundColor: palette.graphite,
              borderRadius: 6,
              padding: 24,
              borderWidth: 0.5,
              borderColor: palette.bone + '14',
            }}
          >
            <ScoreNumeral
              value={round.total_score}
              delta={totalDelta}
              size={88}
              color={palette.bone}
              deltaColor={deltaColor}
            />
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                letterSpacing: 11 * 0.04,
                color: palette.bone,
                opacity: 0.6,
                marginTop: 12,
              }}
            >
              {totalDelta >= 0 ? '+' : ''}
              {totalDelta} · {courseHoleCount ?? 18} holes · Par {round.total_par}
            </Text>
            {totalDelta <= -2 ? (
              <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                <MonoBadge color={palette.brass} bg="transparent" border={false}>
                  ◆ EAGLE
                </MonoBadge>
              </View>
            ) : null}
          </View>

          {/* Hole grid */}
          {holeRows.length > 0 ? (
            <View
              style={{
                marginTop: 16,
                backgroundColor: palette.graphite,
                borderRadius: 6,
                paddingVertical: 16,
                borderWidth: 0.5,
                borderColor: palette.bone + '14',
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 9,
                  letterSpacing: 9 * 0.2,
                  color: palette.bone,
                  opacity: 0.55,
                  textTransform: 'uppercase',
                  paddingHorizontal: 20,
                  marginBottom: 8,
                }}
              >
                HOLES
              </Text>
              <HoleGrid holes={holeRows} fg={palette.bone} />
              {/* Legend */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 16,
                  paddingHorizontal: 20,
                  marginTop: 8,
                  alignItems: 'center',
                }}
              >
                <LegendDot color={palette.sage} label="Birdie+" />
                <LegendDot color={palette.bone + '24'} label="Par" />
                <LegendDot color={palette.clay + '66'} label="Bogey+" />
              </View>
            </View>
          ) : null}

          {viewerId && round ? (
            <View style={{ marginTop: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <LikeButton viewerId={viewerId} roundId={round.id} />
                <Text
                  style={{
                    fontFamily: fontFamily.mono,
                    fontSize: 12,
                    color: palette.bone,
                    opacity: 0.7,
                    marginLeft: 16,
                  }}
                >
                  💬 {comments.length}
                </Text>
              </View>

              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 10,
                  letterSpacing: 10 * 0.18,
                  color: palette.bone,
                  opacity: 0.55,
                  textTransform: 'uppercase',
                  marginTop: 16,
                  marginBottom: 4,
                }}
              >
                COMMENTS · {comments.length}
              </Text>
              <CommentList comments={comments} viewerId={viewerId} roundId={round.id} />
            </View>
          ) : null}
        </ScrollView>

        {viewerId && round ? (
          <View
            style={{
              borderTopWidth: 0.5,
              borderTopColor: palette.bone + '1F',
              backgroundColor: palette.ink,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 8),
            }}
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text
        style={{ fontFamily: fontFamily.mono, fontSize: 10, color: palette.bone, opacity: 0.55 }}
      >
        {label}
      </Text>
    </View>
  );
}
