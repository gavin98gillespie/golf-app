import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { useActionSheet } from '@/components/ActionSheet';
import type { CommentWithAuthor } from '@/lib/queries/comments';
import { useDeleteComment } from '@/lib/queries/comments';

type Props = {
  comments: CommentWithAuthor[];
  viewerId: string | undefined;
  roundId: string;
};

export function CommentList({ comments, viewerId, roundId }: Props) {
  const deleteComment = useDeleteComment();
  const sheet = useActionSheet();

  if (comments.length === 0) {
    return <Text className="text-text-secondary text-sm py-2">No comments yet.</Text>;
  }

  const confirmDelete = (commentId: string) => {
    sheet.show({
      title: 'Delete comment?',
      subtitle: 'This cannot be undone.',
      actions: [
        {
          label: 'Delete',
          tone: 'destructive',
          onPress: () => deleteComment.mutate({ commentId, roundId }),
        },
      ],
    });
  };

  const renderRightActions = (commentId: string) => {
    const RightActions = () => (
      <Pressable
        onPress={() => confirmDelete(commentId)}
        className="bg-clay justify-center px-6 active:opacity-80"
      >
        <Text className="text-white font-semibold">Delete</Text>
      </Pressable>
    );
    RightActions.displayName = 'CommentRightActions';
    return RightActions;
  };

  return (
    <View>
      {comments.map((c) => {
        const isMine = !!viewerId && c.user_id === viewerId;
        const inner = (
          <View className="py-3 border-b border-border-subtle bg-bg-base">
            <Pressable
              onPress={() =>
                c.profiles?.username
                  ? router.push({
                      pathname: '/profile/[username]',
                      params: { username: c.profiles.username },
                    })
                  : null
              }
              className="active:opacity-70"
            >
              <View className="flex-row items-center">
                <View className="w-7 h-7 rounded-full bg-bg-surface border border-border-subtle items-center justify-center">
                  <Text className="text-text-secondary text-xs font-semibold">
                    {(c.profiles?.display_name ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text className="text-text-primary text-sm font-semibold ml-2">
                  {c.profiles?.display_name ?? 'Unknown'}
                </Text>
                <Text className="text-text-secondary text-xs ml-2">
                  {format(new Date(c.created_at), 'MMM d')}
                </Text>
              </View>
            </Pressable>
            <Text className="text-text-primary text-sm mt-1 leading-5">{c.body}</Text>
          </View>
        );

        if (isMine) {
          return (
            <ReanimatedSwipeable
              key={c.id}
              renderRightActions={renderRightActions(c.id)}
              friction={2}
              rightThreshold={40}
            >
              {inner}
            </ReanimatedSwipeable>
          );
        }
        return <View key={c.id}>{inner}</View>;
      })}
    </View>
  );
}
