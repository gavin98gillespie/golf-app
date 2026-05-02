import { useState } from 'react';
import { Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ScreenContainer } from '@/components/ScreenContainer';
import { signIn } from '@/lib/auth';

const Schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Required'),
});

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
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-center">
          <Text className="text-text-primary text-3xl font-light tracking-tight mb-2">
            Welcome back
          </Text>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
          />
          {error ? <Text className="text-red-500 text-sm mb-4">{error}</Text> : null}
          <Button label="Sign in" onPress={onSubmit} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
