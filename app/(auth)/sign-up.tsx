import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { z } from 'zod';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { useActionSheet } from '@/components/ActionSheet';
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
  const sheet = useActionSheet();

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
      sheet.show({
        title: 'Check your email',
        subtitle:
          'We sent you a confirmation link. Tap it to finish creating your account, then come back and sign in.',
        actions: [{ label: 'OK', onPress: () => router.replace('/(auth)/sign-in') }],
      });
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
        <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 24 }}>
          <Wordmark size={28} color={palette.ink} />
        </View>
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

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginTop: 14,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 10,
                letterSpacing: 10 * 0.14,
                color: palette.ink,
                opacity: 0.55,
                textTransform: 'uppercase',
              }}
            >
              BY CREATING AN ACCOUNT YOU AGREE TO OUR{' '}
            </Text>
            <Pressable
              onPress={() =>
                WebBrowser.openBrowserAsync(
                  'https://gavin98gillespie.github.io/golf-app/legal/terms.html',
                )
              }
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 10,
                  letterSpacing: 10 * 0.14,
                  color: palette.fairway,
                  textTransform: 'uppercase',
                }}
              >
                TERMS
              </Text>
            </Pressable>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 10,
                letterSpacing: 10 * 0.14,
                color: palette.ink,
                opacity: 0.55,
                textTransform: 'uppercase',
              }}
            >
              {' '}AND{' '}
            </Text>
            <Pressable
              onPress={() =>
                WebBrowser.openBrowserAsync(
                  'https://gavin98gillespie.github.io/golf-app/legal/privacy.html',
                )
              }
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 10,
                  letterSpacing: 10 * 0.14,
                  color: palette.fairway,
                  textTransform: 'uppercase',
                }}
              >
                PRIVACY
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.replace('/(auth)/sign-in')}
            hitSlop={12}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              alignSelf: 'center',
              marginTop: 16,
            }}
          >
            <Text style={monoLabel}>ALREADY HAVE AN ACCOUNT? SIGN IN.</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
