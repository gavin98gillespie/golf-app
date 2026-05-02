import { useState } from 'react';
import { Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useSession } from '@/lib/hooks/useSession';
import { useCheckUsername, useCreateProfile } from '@/lib/queries/profile';

const Schema = z.object({
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'At most 30')
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, underscore'),
  displayName: z.string().min(1, 'Required').max(60, 'At most 60'),
});

export default function ProfileSetup() {
  const { session } = useSession();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const checkUsername = useCheckUsername();
  const createProfile = useCreateProfile();

  async function onSubmit() {
    setError(null);
    if (!session) {
      setError('No session. Sign in again.');
      return;
    }
    const parsed = Schema.safeParse({ username, displayName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    try {
      const available = await checkUsername.mutateAsync(parsed.data.username);
      if (!available) {
        setError('Username taken. Try another.');
        return;
      }
      await createProfile.mutateAsync({
        id: session.user.id,
        username: parsed.data.username,
        display_name: parsed.data.displayName,
      });
      router.replace('/(app)/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  const loading = checkUsername.isPending || createProfile.isPending;

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-center">
          <Text className="text-text-primary text-3xl font-light tracking-tight mb-2">
            Create your profile
          </Text>
          <Text className="text-text-secondary text-sm mb-8">
            How you&apos;ll show up to friends.
          </Text>
          <Input
            label="Username"
            value={username}
            onChangeText={(v) => setUsername(v.toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
          />
          <Input
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            autoComplete="name"
          />
          {error ? <Text className="text-red-500 text-sm mb-4">{error}</Text> : null}
          <Button label="Continue" onPress={onSubmit} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
