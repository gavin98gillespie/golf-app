import { useState } from 'react';
import { Pressable, Text, TextInput, View, ActivityIndicator } from 'react-native';

import { usePostComment } from '@/lib/queries/comments';

type Props = { viewerId: string; roundId: string };

export function CommentInput({ viewerId, roundId }: Props) {
  const [body, setBody] = useState('');
  const post = usePostComment();
  const trimmed = body.trim();
  const canSend = trimmed.length > 0 && !post.isPending;

  const onSend = () => {
    if (!canSend) return;
    post.mutate({ userId: viewerId, roundId, body: trimmed }, { onSuccess: () => setBody('') });
  };

  return (
    <View className="flex-row items-center mt-3">
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Add a comment…"
        placeholderTextColor="#4a5a52"
        multiline
        maxLength={500}
        className="flex-1 bg-bg-surface border border-border-subtle rounded-2xl px-4 py-3 text-text-primary text-sm"
      />
      <Pressable
        disabled={!canSend}
        onPress={onSend}
        className={`ml-2 px-4 py-3 rounded-full ${canSend ? 'bg-accent active:opacity-70' : 'bg-bg-surface opacity-50'}`}
      >
        {post.isPending ? (
          <ActivityIndicator size="small" color="#08100c" />
        ) : (
          <Text
            className={`text-sm font-semibold ${canSend ? 'text-bg-base' : 'text-text-secondary'}`}
          >
            Send
          </Text>
        )}
      </Pressable>
    </View>
  );
}
