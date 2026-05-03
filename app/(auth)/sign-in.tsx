import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';

import { ScreenContainer } from '@/components/ScreenContainer';
import { signIn } from '@/lib/auth';
import { fontFamily, palette } from '@/theme/linksman';

const Schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Required'),
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

export default function SignIn() {
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
    const { error: authError } = await signIn(parsed.data.email, parsed.data.password);
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.replace('/(app)/(tabs)');
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
          <Text style={monoLabel}>SIGN IN</Text>
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 28,
              color: palette.ink,
              marginTop: 8,
              marginBottom: 40,
            }}
          >
            Welcome back.
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
              autoComplete="password"
              placeholder="••••••••"
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
              {loading ? 'SIGNING IN…' : 'SIGN IN'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace('/(auth)/sign-up')}
            className="mt-8 items-center"
          >
            <Text style={monoLabel}>NO ACCOUNT? CREATE ONE.</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
