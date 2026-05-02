import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';

import { parseLocalDate } from '@/lib/date';
import { useHasLiked, useLikeCount, useLike, useUnlike } from '@/lib/queries/likes';
import { useComments } from '@/lib/queries/comments';
import type { FeedRound } from '@/lib/queries/feed';

type Props = {
  round: FeedRound;
  viewerId: string;
};

export function FeedRoundCard({ round, viewerId }: Props) {
  const owner = round.profiles;
  const course = round.courses;
  const diff = round.total_score - round.total_par;
  const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;

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

  return (
    <Pressable
      onPress={goToRound}
      className="bg-bg-surface border border-border-subtle rounded-2xl p-4 mb-3 active:opacity-70"
    >
      <View className="flex-row items-center">
        <View className="w-10 h-10 rounded-full bg-bg-base border border-border-subtle items-center justify-center">
          <Text className="text-text-secondary text-base font-semibold">
            {(owner?.display_name ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-text-primary text-base font-semibold">
            {owner?.display_name ?? 'Unknown'}
          </Text>
          <Text className="text-text-secondary text-xs">
            @{owner?.username ?? '—'} · {format(parseLocalDate(round.played_at), 'MMM d')}
          </Text>
        </View>
      </View>

      <View className="flex-row items-end justify-between mt-3">
        <View>
          <Text className="text-text-primary text-lg font-light">
            {course?.name ?? 'Unknown course'}
          </Text>
          <Text className="text-text-secondary text-xs">{course?.hole_count ?? 18} holes</Text>
        </View>
        <View className="items-end">
          <Text className="text-text-primary text-3xl font-light">{round.total_score}</Text>
          <Text
            className={`text-sm font-semibold ${
              diff < 0 ? 'text-accent' : diff > 0 ? 'text-text-secondary' : 'text-text-primary'
            }`}
          >
            {diffLabel} vs par
          </Text>
        </View>
      </View>

      {/* Inline action row */}
      <View className="flex-row items-center mt-4 pt-3 border-t border-border-subtle">
        <Pressable
          onPress={onTapLike}
          disabled={busy}
          hitSlop={8}
          className={`flex-row items-center mr-5 ${busy ? 'opacity-50' : 'active:opacity-60'}`}
        >
          <Text className="text-lg">{liked ? '❤️' : '🤍'}</Text>
          <Text className="text-text-secondary text-sm font-semibold ml-2">{likeCount}</Text>
        </Pressable>
        <Pressable
          onPress={goToRound}
          hitSlop={8}
          className="flex-row items-center active:opacity-60"
        >
          <Text className="text-lg">💬</Text>
          <Text className="text-text-secondary text-sm font-semibold ml-2">{commentCount}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
