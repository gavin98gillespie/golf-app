import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';

import type { CommentWithAuthor } from '@/lib/queries/comments';

type Props = { comments: CommentWithAuthor[] };

export function CommentList({ comments }: Props) {
  if (comments.length === 0) {
    return <Text className="text-text-secondary text-sm py-2">No comments yet.</Text>;
  }
  return (
    <View>
      {comments.map((c) => (
        <View key={c.id} className="py-3 border-b border-border-subtle">
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
      ))}
    </View>
  );
}
