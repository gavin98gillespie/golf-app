import { Pressable, Text } from 'react-native';

import { useHasLiked, useLikeCount, useLike, useUnlike } from '@/lib/queries/likes';

type Props = { viewerId: string; roundId: string };

export function LikeButton({ viewerId, roundId }: Props) {
  const hasLikedQ = useHasLiked(viewerId, roundId);
  const countQ = useLikeCount(roundId);
  const like = useLike();
  const unlike = useUnlike();

  const liked = hasLikedQ.data ?? false;
  const count = countQ.data ?? 0;
  const busy = like.isPending || unlike.isPending;

  return (
    <Pressable
      disabled={busy}
      onPress={() => {
        if (liked) unlike.mutate({ userId: viewerId, roundId });
        else like.mutate({ userId: viewerId, roundId });
      }}
      className={`flex-row items-center px-3 py-2 rounded-full ${busy ? 'opacity-50' : 'active:opacity-70'}`}
    >
      <Text className={`text-base ${liked ? 'text-clay' : 'text-text-secondary'}`}>◆</Text>
      <Text className="text-text-primary text-sm font-semibold ml-2">{count}</Text>
    </Pressable>
  );
}
