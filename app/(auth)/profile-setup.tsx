import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';

import { ScreenContainer } from '@/components/ScreenContainer';
import { useSession } from '@/lib/hooks/useSession';
import { explainProfanity } from '@/lib/profanity';
import { useCheckUsername, useCreateProfile } from '@/lib/queries/profile';
import { fontFamily, palette } from '@/theme/linksman';

const Schema = z.object({
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'At most 30')
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, underscore'),
  displayName: z.string().min(1, 'Required').max(60, 'At most 60'),
});

const monoLabel = {
  fontFamily: fontFamily.mono,
  fontSize: 11,
  letterSpacing: 0.18 * 11,
  color: palette.ink,
  opacity: 0.55,
} as const;

const fieldStyle = {
  fontFamily: fontFamily.editorial,
  fontSize: 18,
  color: palette.ink,
  paddingVertical: 8,
} as const;

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
    const profanityError =
      explainProfanity(parsed.data.username) ?? explainProfanity(parsed.data.displayName);
    if (profanityError) {
      setError(profanityError);
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
    <ScreenContainer surface="bone">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 mt-12">
          <Text style={monoLabel}>PROFILE</Text>
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 28,
              color: palette.ink,
              marginTop: 8,
              marginBottom: 40,
            }}
          >
            Pick your handle.
          </Text>

          <View className="mb-6">
            <Text style={[monoLabel, { marginBottom: 6 }]}>USERNAME</Text>
            <TextInput
              value={username}
              onChangeText={(v) => setUsername(v.toLowerCase())}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              placeholder="lowercase, numbers, underscore"
              placeholderTextColor={`${palette.ink}55`}
              style={fieldStyle}
              className="border-b border-ink/20"
            />
          </View>

          <View className="mb-6">
            <Text style={[monoLabel, { marginBottom: 6 }]}>DISPLAY NAME</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              autoComplete="name"
              placeholder="how friends see you"
              placeholderTextColor={`${palette.ink}55`}
              style={fieldStyle}
              className="border-b border-ink/20"
            />
          </View>

          {error ? (
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 12,
                letterSpacing: 0.18 * 12,
                color: palette.clay,
                marginBottom: 16,
              }}
            >
              {error.toUpperCase()}
            </Text>
          ) : null}

          <Pressable
            onPress={onSubmit}
            disabled={loading}
            className="bg-ink rounded-full py-4 items-center mt-4"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 13,
                letterSpacing: 0.18 * 13,
                color: palette.bone,
              }}
            >
              {loading ? 'SAVING…' : 'CONTINUE'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
