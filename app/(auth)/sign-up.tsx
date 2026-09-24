import { useState } from 'react';
import { Keyboard, ScrollView, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AccountField } from '@/components/AccountField';
import { useActionSheet } from '@/components/ActionSheet';
import { useCheckUsername } from '@/lib/queries/profile';
import { SignUpSchema } from '@/lib/profileForm';
import { signUp } from '@/lib/auth';
import { fontFamily, palette } from '@/theme/linksman';

export default function SignUp() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const checkUsername = useCheckUsername();
  const sheet = useActionSheet();
  async function onSubmit() {
    if (loading) return;
    setError(null);
    const parsed = SignUpSchema.safeParse({ displayName, username, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    try {
      if (!(await checkUsername.mutateAsync(parsed.data.username))) {
        setError('That username is taken. Try another.');
        return;
      }
      const result = await signUp(parsed.data.email, parsed.data.password, {
        username: parsed.data.username,
        display_name: parsed.data.displayName,
      });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      if (result.needsEmailConfirmation) {
        sheet.show({
          title: 'Check your email',
          subtitle: 'Confirm your email, then sign in. Your profile details are already saved.',
          actions: [{ label: 'Go to sign in', onPress: () => router.replace('/(auth)/sign-in') }],
        });
      } else router.replace('/(app)/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your account. Try again.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <ScreenContainer surface="bone">
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={{ minHeight: 48, justifyContent: 'center' }}
        >
          <Text style={{ color: palette.fairway, fontSize: 16 }}>← Back</Text>
        </Pressable>
        <Text
          style={{ fontFamily: fontFamily.display, fontSize: 32, color: palette.ink, marginTop: 8 }}
        >
          Create account
        </Text>
        <Text
          style={{
            color: palette.ink + 'AA',
            fontSize: 16,
            lineHeight: 23,
            marginTop: 8,
            marginBottom: 24,
          }}
        >
          Just the basics. Add your home course and other details whenever you like.
        </Text>
        <AccountField
          label="Name"
          value={displayName}
          onChangeText={setDisplayName}
          autoComplete="name"
          maxLength={60}
          placeholder="How friends know you"
        />
        <AccountField
          label="Username"
          value={username}
          onChangeText={(v) => setUsername(v.toLowerCase())}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={30}
          placeholder="e.g. gavin_g"
        />
        <AccountField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <AccountField
          label="Password"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password-new"
          secureTextEntry
          placeholder="At least 8 characters"
        />
        {error ? (
          <Text
            accessibilityRole="alert"
            style={{ color: palette.clay, fontSize: 15, marginBottom: 16 }}
          >
            {error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={() => void onSubmit()}
          style={{
            backgroundColor: palette.ink,
            borderRadius: 26,
            minHeight: 52,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: palette.bone }}>
            {loading ? 'Creating account…' : 'Create account'}
          </Text>
        </Pressable>
        <View style={{ marginTop: 16 }}>
          <Text
            style={{ color: palette.ink + 'AA', textAlign: 'center', fontSize: 13, lineHeight: 20 }}
          >
            By creating an account, you agree to our{' '}
            <Text
              style={{ color: palette.fairway, textDecorationLine: 'underline' }}
              onPress={() =>
                void WebBrowser.openBrowserAsync(
                  'https://gavin98gillespie.github.io/golf-app/legal/terms.html',
                )
              }
            >
              Terms
            </Text>{' '}
            and{' '}
            <Text
              style={{ color: palette.fairway, textDecorationLine: 'underline' }}
              onPress={() =>
                void WebBrowser.openBrowserAsync(
                  'https://gavin98gillespie.github.io/golf-app/legal/privacy.html',
                )
              }
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(auth)/sign-in')}
          style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}
        >
          <Text style={{ color: palette.fairway, fontSize: 16 }}>
            Already have an account? Sign in
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
