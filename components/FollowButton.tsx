import { Pressable, Text, ActivityIndicator } from 'react-native';

import { useFollow, useUnfollow, useIsFollowing } from '@/lib/queries/follows';

type Props = {
  viewerId: string;
  targetId: string;
  size?: 'sm' | 'md';
};

export function FollowButton({ viewerId, targetId, size = 'md' }: Props) {
  const isFollowingQ = useIsFollowing(viewerId, targetId);
  const follow = useFollow();
  const unfollow = useUnfollow();

  if (viewerId === targetId) return null;

  const isFollowing = isFollowingQ.data ?? false;
  const busy = follow.isPending || unfollow.isPending || isFollowingQ.isLoading;

  const onPress = () => {
    if (busy) return;
    if (isFollowing) {
      unfollow.mutate({ followerId: viewerId, followingId: targetId });
    } else {
      follow.mutate({ followerId: viewerId, followingId: targetId });
    }
  };

  const padding = size === 'sm' ? 'px-3 py-1' : 'px-4 py-2';
  const fontSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className={`${padding} rounded-full border ${
        isFollowing ? 'border-border-subtle bg-transparent' : 'border-accent bg-accent'
      } ${busy ? 'opacity-50' : 'active:opacity-70'}`}
    >
      {busy ? (
        <ActivityIndicator size="small" color={isFollowing ? '#a3a3a3' : '#08100c'} />
      ) : (
        <Text
          className={`${fontSize} font-semibold ${
            isFollowing ? 'text-text-secondary' : 'text-bg-base'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      )}
    </Pressable>
  );
}
