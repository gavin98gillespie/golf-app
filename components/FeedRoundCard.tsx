import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { format } from 'date-fns';

import { palette, fontFamily } from '@/theme/linksman';
import { Topo } from '@/components/Topo';
import { Crosshair } from '@/components/Crosshair';
import { ScoreNumeral } from '@/components/ScoreNumeral';
import { MonoBadge } from '@/components/MonoBadge';
import { parseLocalDate } from '@/lib/date';
import { useHasLiked, useLikeCount, useLike, useUnlike } from '@/lib/queries/likes';
import { useComments } from '@/lib/queries/comments';
import type { FeedRound } from '@/lib/queries/feed';

type Props = { round: FeedRound; viewerId: string };

export function FeedRoundCard({ round, viewerId }: Props) {
  const owner = round.profiles;
  const course = round.courses;
  const diff = round.total_score - round.total_par;
  const isUnder = diff < 0;
  const isEagleOrBetter = diff <= -2;

  const hasLikedQ = useHasLiked(viewerId, round.id);
  const likeCountQ = useLikeCount(round.id);
  const commentsQ = useComments(round.id);
  const like = useLike();
  const unlike = useUnlike();

  const liked = hasLikedQ.data ?? false;
  const likeCount = likeCountQ.data ?? 0;
  const commentCount = (commentsQ.data ?? []).length;
  const busy = like.isPending || unlike.isPending;

  const goToRound = () => router.push({ pathname: '/round/[id]', params: { id: round.id } });

  const onTapLike = () => {
    if (busy) return;
    if (liked) unlike.mutate({ userId: viewerId, roundId: round.id });
    else like.mutate({ userId: viewerId, roundId: round.id });
  };

  const seed = `${round.course_id ?? 'course'}-${round.id}`;
  const topoHeight = isEagleOrBetter ? 168 : 132;
  const fg = palette.bone;
  const bg = palette.graphite;
  const hairline = fg + '1f';

  return (
    <Pressable
      onPress={goToRound}
      style={{
        backgroundColor: bg,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 14,
        borderWidth: 0.5,
        borderColor: hairline,
      }}
    >
      {/* Owner header strip */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: hairline,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: palette.ink,
            borderWidth: 0.5,
            borderColor: fg + '20',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: fontFamily.display, fontSize: 16, color: fg }}>
            {(owner?.display_name ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 17, color: fg }}>
            {owner?.display_name ?? 'Unknown'}
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              color: fg,
              opacity: 0.55,
            }}
          >
            @{owner?.username ?? '—'}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 10,
            letterSpacing: 10 * 0.16,
            color: fg,
            opacity: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {format(parseLocalDate(round.played_at), 'MMM d').toUpperCase()}
        </Text>
      </View>

      {/* Topo header */}
      <View style={{ position: 'relative', height: topoHeight }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.85 }}>
          <Topo
            seed={seed}
            width={400}
            height={topoHeight}
            stroke={fg + '22'}
            strokeBold={fg + '38'}
            greenColor={isEagleOrBetter ? palette.brass + '40' : palette.fairway + '55'}
            jitter={0.22}
            showPin
            pinColor={isEagleOrBetter ? palette.brass : palette.fairway}
          />
        </View>

        <View style={{ position: 'absolute', top: 10, left: 10 }}>
          <Crosshair size={8} color={fg} opacity={0.6} />
        </View>
        <View style={{ position: 'absolute', top: 10, right: 10 }}>
          <Crosshair size={8} color={fg} opacity={0.6} />
        </View>

        {/* Top metadata (eagle badge only — date moved to owner strip) */}
        {isEagleOrBetter ? (
          <View
            style={{
              position: 'absolute',
              top: 14,
              right: 24,
            }}
          >
            <MonoBadge color={palette.brass} bg="transparent" border={false}>
              ◆ EAGLE
            </MonoBadge>
          </View>
        ) : null}

        {/* Course label bottom */}
        <View
          style={{
            position: 'absolute',
            bottom: 12,
            left: 24,
            right: 24,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: fontFamily.display,
                fontSize: 17,
                letterSpacing: -17 * 0.01,
                color: fg,
              }}
            >
              {course?.name ?? 'Unknown course'}
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 9,
                letterSpacing: 9 * 0.16,
                color: fg,
                opacity: 0.55,
                marginTop: 2,
                textTransform: 'uppercase',
              }}
            >
              {course?.hole_count ?? 18} HOLES
            </Text>
          </View>
        </View>
      </View>

      {/* Score block */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 18,
          paddingBottom: 14,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderTopWidth: 0.5,
          borderTopColor: hairline,
        }}
      >
        <View style={{ gap: 6 }}>
          <ScoreNumeral
            value={round.total_score}
            delta={diff}
            size={isEagleOrBetter ? 76 : 60}
            color={fg}
            deltaColor={
              isEagleOrBetter
                ? palette.brass
                : isUnder
                  ? palette.brass
                  : diff > 3
                    ? palette.clay
                    : fg + '99'
            }
          />
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 10,
              color: fg,
              opacity: 0.55,
            }}
          >
            par {round.total_par}
          </Text>
        </View>
      </View>

      {/* Note */}
      {round.notes ? (
        <View
          style={{
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderTopWidth: 0.5,
            borderTopColor: hairline,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamily.displayItalic,
              fontSize: 14,
              color: fg,
              opacity: 0.85,
              lineHeight: 20,
            }}
          >
            “{round.notes}”
          </Text>
        </View>
      ) : null}

      {/* Reactions row */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderTopWidth: 0.5,
          borderTopColor: hairline,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Pressable
            onPress={onTapLike}
            disabled={busy}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: busy ? 0.5 : 1 }}
          >
            <FlagstickIcon color={liked ? palette.brass : fg} filled={liked} />
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                color: fg,
                fontVariant: ['tabular-nums'],
              }}
            >
              {likeCount}
            </Text>
          </Pressable>
          <Pressable
            onPress={goToRound}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <CommentIcon color={fg} />
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                color: fg,
                fontVariant: ['tabular-nums'],
              }}
            >
              {commentCount}
            </Text>
          </Pressable>
        </View>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.18,
            color: fg,
            opacity: 0.4,
            textTransform: 'uppercase',
          }}
        >
          VIEW ROUND
        </Text>
      </View>
    </Pressable>
  );
}

function FlagstickIcon({ color, filled }: { color: string; filled: boolean }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Line x1={3} y1={2} x2={3} y2={12} stroke={color} strokeWidth={1.2} />
      <Path d="M3 2 L9 3.5 L3 5 Z" fill={filled ? color : color} stroke={color} strokeWidth={1.2} />
      <Circle cx={3} cy={12} r={1} fill={color} />
    </Svg>
  );
}

function CommentIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Path d="M2 3 H12 V9 H7 L4 12 V9 H2 Z" stroke={color} strokeWidth={1.1} fill="none" />
    </Svg>
  );
}
