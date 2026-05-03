import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';

import { ScreenContainer } from '@/components/ScreenContainer';
import { signUp } from '@/lib/auth';
import { fontFamily, palette } from '@/theme/linksman';

const Schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
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

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    const parsed = Schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    setLoading(true);
    const { error: authError, needsEmailConfirmation } = await signUp(
      parsed.data.email,
      parsed.data.password,
    );
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    if (needsEmailConfirmation) {
      Alert.alert(
        'Check your email',
        'We sent you a confirmation link. Tap it to finish creating your account, then come back and sign in.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }],
      );
      return;
    }
    router.replace('/(auth)/profile-setup');
  }

  return (
    <ScreenContainer surface="bone">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable onPress={() => router.back()} className="mt-2 mb-8 self-start">
          <Text style={monoLabel}>← BACK</Text>
        </Pressable>

        <View className="flex-1">
          <Text style={monoLabel}>CREATE ACCOUNT</Text>
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 28,
              color: palette.ink,
              marginTop: 8,
              marginBottom: 40,
            }}
          >
            Get started.
          </Text>

          <View className="mb-6">
            <Text style={[monoLabel, { marginBottom: 6 }]}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@domain.com"
              placeholderTextColor={`${palette.ink}55`}
              style={fieldStyle}
              className="border-b border-ink/20"
            />
          </View>

          <View className="mb-6">
            <Text style={[monoLabel, { marginBottom: 6 }]}>PASSWORD</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              placeholder="at least 8 characters"
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
              {loading ? 'CREATING…' : 'CREATE ACCOUNT'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace('/(auth)/sign-in')}
            className="mt-8 items-center"
          >
            <Text style={monoLabel}>ALREADY HAVE AN ACCOUNT? SIGN IN.</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
