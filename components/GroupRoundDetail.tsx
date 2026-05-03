import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenContainer } from '@/components/ScreenContainer';
import { HoleGrid } from '@/components/HoleGrid';
import { Topo } from '@/components/Topo';
import { LikeButton } from '@/components/LikeButton';
import { CommentList } from '@/components/CommentList';
import { CommentInput } from '@/components/CommentInput';
import { ReportSheet } from '@/components/ReportSheet';
import { useActionSheet } from '@/components/ActionSheet';
import { useGroupRound, useDeleteMySlice } from '@/lib/queries/groupRounds';
import { useSession } from '@/lib/hooks/useSession';
import { useComments } from '@/lib/queries/comments';
import type { ReportTargetType } from '@/lib/queries/reports';
import { palette, fontFamily } from '@/theme/linksman';
import { parseLocalDate } from '@/lib/date';
import { supabase } from '@/lib/supabase';

export function GroupRoundDetail({ roundId }: { roundId: string }) {
  const { session } = useSession();
  const viewerId = session?.user.id;
  const insets = useSafeAreaInsets();
  const groupQ = useGroupRound(roundId);
  const round = groupQ.data?.round;
  const players = groupQ.data?.players ?? [];
  const holes = groupQ.data?.holes ?? [];
  const commentsQ = useComments(roundId);
  const comments = commentsQ.data ?? [];
  const deleteMine = useDeleteMySlice();
  const sheet = useActionSheet();

  const [reportTarget, setReportTarget] = useState<{ type: ReportTargetType; id: string } | null>(
    null,
  );

  const me = players.find((p) => p.user_id === viewerId);
  const canEditOrDelete = !!me && (me.status === 'joined' || me.status === 'finished');

  const onTapMore = () => {
    if (!viewerId) return;
    sheet.show({
      eyebrow: 'OPTIONS',
      title: 'Group round',
      actions: [
        ...(canEditOrDelete
          ? [
              {
                label: 'Edit my round',
                onPress: () =>
                  router.push({
                    pathname: '/round/group/[id]/score',
                    params: { id: roundId, hole: '1' },
                  }),
              },
              {
                label: 'Delete my round',
                tone: 'destructive' as const,
                onPress: () =>
                  sheet.show({
                    title: 'Delete your round?',
                    subtitle:
                      'This removes your scores from this group round. Other players will still see the round without you.',
                    actions: [
                      {
                        label: 'Delete',
                        tone: 'destructive' as const,
                        onPress: async () => {
                          try {
                            await deleteMine.mutateAsync({ roundId, userId: viewerId });
                            router.back();
                          } catch (e) {
                            sheet.show({
                              title: 'Could not delete',
                              subtitle: (e as Error).message,
                              actions: [{ label: 'OK' }],
                            });
                          }
                        },
                      },
                    ],
                  }),
              },
            ]
          : []),
        {
          label: 'Report this round',
          onPress: () => setReportTarget({ type: 'round', id: roundId }),
        },
      ],
    });
  };

  const [courseName, setCourseName] = useState<string | null>(null);
  useEffect(() => {
    if (!round?.course_id) return;
    void supabase
      .from('courses')
      .select('name')
      .eq('id', round.course_id)
      .maybeSingle()
      .then(({ data }) => setCourseName((data as { name: string } | null)?.name ?? null));
  }, [round?.course_id]);

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

  const visiblePlayers = players.filter((p) => p.status !== 'invited');

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
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              paddingTop: 8,
              paddingBottom: 14,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
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

          {/* Header — group label, course name, date, with topo backdrop */}
          <View
            style={{
              position: 'relative',
              paddingTop: 24,
              paddingBottom: 24,
              borderBottomWidth: 0.5,
              borderBottomColor: palette.bone + '1F',
              overflow: 'hidden',
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: -24,
                right: -24,
                bottom: 0,
                opacity: 0.18,
              }}
            >
              <Topo
                seed={`group-${round.id}`}
                width={400}
                height={240}
                stroke={palette.bone + '22'}
              />
            </View>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 9,
                letterSpacing: 9 * 0.2,
                color: palette.bone,
                opacity: 0.55,
                textTransform: 'uppercase',
              }}
            >
              GROUP ROUND · {visiblePlayers.length} PLAYERS
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.display,
                fontSize: 32,
                letterSpacing: -32 * 0.02,
                color: palette.bone,
                marginTop: 4,
                lineHeight: 32 * 1.05,
              }}
              numberOfLines={2}
            >
              {courseName ?? '...'}
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                letterSpacing: 11 * 0.16,
                color: palette.bone,
                opacity: 0.6,
                marginTop: 6,
                textTransform: 'uppercase',
              }}
            >
              {format(parseLocalDate(round.played_at), 'MMM d, yyyy').toUpperCase()}
            </Text>
          </View>

          {/* Per-player slices */}
          {visiblePlayers.map((p) => {
            const playerHoles = holes
              .filter((h) => h.player_id === p.user_id)
              .slice()
              .sort((a, b) => a.hole_number - b.hole_number)
              .map((h) => ({ score: h.score, par: h.par, delta: h.score - h.par }));
            const total = playerHoles.reduce((s, h) => s + h.score, 0);
            const totalPar = playerHoles.reduce((s, h) => s + h.par, 0);
            const diff = total - totalPar;
            const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
            const withdrawn = p.status === 'withdrawn';
            return (
              <View
                key={p.user_id}
                style={{
                  marginTop: 24,
                  paddingTop: 16,
                  borderTopWidth: 0.5,
                  borderColor: palette.bone + '1F',
                  opacity: withdrawn ? 0.55 : 1,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text
                      style={{
                        fontFamily: fontFamily.display,
                        fontSize: 22,
                        color: palette.bone,
                      }}
                      numberOfLines={1}
                    >
                      {p.profile?.display_name ?? '—'}
                    </Text>
                    {p.profile?.username ? (
                      <Text
                        style={{
                          fontFamily: fontFamily.mono,
                          fontSize: 10,
                          color: palette.bone,
                          opacity: 0.55,
                          marginTop: 2,
                        }}
                      >
                        @{p.profile.username}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    style={{
                      fontFamily: fontFamily.display,
                      fontSize: 28,
                      color: palette.bone,
                    }}
                  >
                    {withdrawn ? 'WITHDREW' : playerHoles.length === 0 ? '—' : `${total}`}
                  </Text>
                  {!withdrawn && playerHoles.length > 0 ? (
                    <Text
                      style={{
                        fontFamily: fontFamily.mono,
                        fontSize: 11,
                        color: palette.bone,
                        opacity: 0.6,
                        marginLeft: 8,
                        width: 40,
                        textAlign: 'right',
                      }}
                    >
                      {diffLabel}
                    </Text>
                  ) : null}
                </View>
                {playerHoles.length > 0 ? (
                  <View style={{ marginTop: 12 }}>
                    <HoleGrid holes={playerHoles} fg={palette.bone} compact />
                  </View>
                ) : null}
                {p.notes ? (
                  <Text
                    style={{
                      fontFamily: fontFamily.displayItalic ?? fontFamily.display,
                      fontSize: 16,
                      color: palette.bone,
                      marginTop: 12,
                      lineHeight: 22,
                    }}
                  >
                    “{p.notes}”
                  </Text>
                ) : null}
              </View>
            );
          })}

          {/* Like + comment row, round-level */}
          {viewerId ? (
            <View
              style={{
                marginTop: 32,
                paddingTop: 16,
                borderTopWidth: 0.5,
                borderColor: palette.bone + '1F',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <LikeButton viewerId={viewerId} roundId={roundId} />
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 12,
                  letterSpacing: 12 * 0.14,
                  color: palette.bone,
                  opacity: 0.7,
                  marginLeft: 16,
                }}
              >
                {comments.length} COMMENTS
              </Text>
            </View>
          ) : null}

          {/* Comment thread */}
          {viewerId ? (
            <View style={{ marginTop: 16 }}>
              <CommentList comments={comments} viewerId={viewerId} roundId={roundId} />
            </View>
          ) : null}
        </ScrollView>

        {viewerId ? (
          <View
            style={{
              borderTopWidth: 0.5,
              borderTopColor: palette.bone + '1F',
              backgroundColor: palette.ink,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 8),
            }}
          >
            <CommentInput viewerId={viewerId} roundId={roundId} />
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
