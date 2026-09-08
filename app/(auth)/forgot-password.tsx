import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PasswordRecovery } from '@/lib/passwordRecovery';
import { env } from '@/lib/env';
import { fontFamily, palette } from '@/theme/linksman';

export default function ForgotPassword() {
  const [recovery] = useState(
    () =>
      new PasswordRecovery(
        createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        }).auth,
      ),
  );
  const [step, setStep] = useState<'email' | 'code' | 'password' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(
    () => () => {
      void recovery.dispose().catch(() => {});
    },
    [recovery],
  );

  async function submit() {
    if (busy) return;
    Keyboard.dismiss();
    setError(null);
    setBusy(true);
    try {
      if (step === 'email') {
        if (!z.string().email().safeParse(email.trim()).success)
          throw new Error('Enter a valid email address.');
        await recovery.request(email);
        setStep('code');
      } else if (step === 'code') {
        if (!/^\d{6,10}$/.test(code.trim()))
          throw new Error('Enter the full code from your email.');
        await recovery.verify(code);
        setCode('');
        setStep('password');
      } else if (step === 'password') {
        if (password.length < 8) throw new Error('Use at least 8 characters.');
        if (password !== confirm) throw new Error('Your passwords do not match.');
        await recovery.update(password);
        setPassword('');
        setConfirm('');
        setStep('done');
      }
    } catch (err) {
      setError(
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Could not complete this step. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    color: palette.ink,
    fontSize: 18,
    minHeight: 52,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.ink + '33',
    marginBottom: 20,
  };
  return (
    <ScreenContainer surface="bone">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingVertical: 24 }}
        >
          <Pressable
            disabled={busy}
            onPress={() => router.replace('/(auth)/sign-in')}
            accessibilityRole="button"
            style={{ minHeight: 48, justifyContent: 'center' }}
          >
            <Text style={{ color: palette.fairway, fontSize: 17 }}>‹ Back to sign in</Text>
          </Pressable>
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 32,
              color: palette.ink,
              marginVertical: 24,
            }}
          >
            {step === 'done'
              ? 'Password updated.'
              : step === 'password'
                ? 'Choose a new password.'
                : step === 'code'
                  ? 'Check your email.'
                  : 'Forgot your password?'}
          </Text>
          <Text style={{ color: palette.ink, fontSize: 17, lineHeight: 25, marginBottom: 24 }}>
            {step === 'email'
              ? 'Enter your account email and we’ll send a one-time recovery code.'
              : step === 'code'
                ? 'If an account exists for this email, a code will arrive shortly. Check your spam folder too.'
                : step === 'password'
                  ? 'Use at least 8 characters. You’ll sign in with your new password afterward.'
                  : 'You can now sign in with your new password.'}
          </Text>
          {step === 'email' && (
            <TextInput
              accessibilityLabel="Account email"
              placeholder="Email address"
              placeholderTextColor={palette.ink + '77'}
              value={email}
              onChangeText={setEmail}
              editable={!busy}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
              style={inputStyle}
            />
          )}
          {step === 'code' && (
            <TextInput
              accessibilityLabel="Recovery code"
              placeholder="Recovery code"
              placeholderTextColor={palette.ink + '77'}
              value={code}
              onChangeText={setCode}
              editable={!busy}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={10}
              style={inputStyle}
            />
          )}
          {step === 'password' && (
            <>
              <TextInput
                accessibilityLabel="New password"
                placeholder="New password"
                placeholderTextColor={palette.ink + '77'}
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                style={inputStyle}
              />
              <TextInput
                accessibilityLabel="Confirm new password"
                placeholder="Confirm new password"
                placeholderTextColor={palette.ink + '77'}
                value={confirm}
                onChangeText={setConfirm}
                editable={!busy}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
                style={inputStyle}
              />
            </>
          )}
          {error && (
            <Text
              accessibilityRole="alert"
              style={{ color: palette.clay, fontSize: 16, marginBottom: 20 }}
            >
              {error}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, busy }}
            disabled={busy}
            onPress={
              step === 'done' ? () => router.replace('/(auth)/sign-in') : () => void submit()
            }
            style={{
              minHeight: 56,
              borderRadius: 28,
              padding: 16,
              backgroundColor: palette.ink,
              alignItems: 'center',
              opacity: busy ? 0.5 : 1,
            }}
          >
            <Text style={{ color: palette.bone, fontSize: 18 }}>
              {busy
                ? 'Please wait…'
                : step === 'email'
                  ? 'Send recovery code'
                  : step === 'code'
                    ? 'Verify code'
                    : step === 'password'
                      ? 'Save new password'
                      : 'Sign in'}
            </Text>
          </Pressable>
          {step === 'code' && (
            <Pressable
              disabled={busy}
              accessibilityRole="button"
              onPress={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
              style={{ minHeight: 48, marginTop: 16, justifyContent: 'center' }}
            >
              <Text style={{ color: palette.fairway, fontSize: 16 }}>
                Change email or request a new code
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
