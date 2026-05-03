import { Pressable, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { palette, fontFamily } from '@/theme/linksman';
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
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        opacity: busy ? 0.5 : 1,
      }}
    >
      <HeartIcon liked={liked} />
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 13,
          color: palette.bone,
          fontVariant: ['tabular-nums'],
        }}
      >
        {count}
      </Text>
    </Pressable>
  );
}

function HeartIcon({ liked }: { liked: boolean }) {
  // Standard heart SVG path. Fill when liked; stroke-only when not.
  const d =
    'M9 17.5 C5.5 14.5 2 11.5 2 7.5 C2 5.0 4.0 3 6.5 3 C7.9 3 9 4 9 4 C9 4 10.1 3 11.5 3 C14 3 16 5.0 16 7.5 C16 11.5 12.5 14.5 9 17.5 Z';
  return (
    <Svg width={18} height={18} viewBox="0 0 18 20">
      <Path
        d={d}
        fill={liked ? palette.clay : 'none'}
        stroke={liked ? palette.clay : palette.bone}
        strokeWidth={1.5}
      />
    </Svg>
  );
}
