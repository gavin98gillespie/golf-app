import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { signOut } from '@/lib/auth';
import { useSession } from '@/lib/hooks/useSession';
import { useMyProfile } from '@/lib/queries/profile';

export default function Settings() {
  const { session } = useSession();
  const profileQ = useMyProfile(session?.user.id);

  async function onSignOut() {
    await signOut();
    router.replace('/(auth)/welcome');
  }

  function onDeleteAccount() {
    Alert.alert(
      'Delete account',
      'Account deletion ships in Phase 4 (App Store compliance phase). For now, contact support to delete your account.',
    );
  }

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.back()} className="mt-4 mb-2">
        <Text className="text-text-secondary text-sm">← Back</Text>
      </Pressable>
      <Text className="text-text-primary text-3xl font-light tracking-tight mb-6">Settings</Text>

      <View className="bg-bg-surface border border-border-subtle rounded-2xl p-4 mb-6">
        <Text className="text-text-secondary text-xs uppercase tracking-wider mb-1">
          Signed in as
        </Text>
        <Text className="text-text-primary text-base">
          {profileQ.data?.display_name ?? '—'}{' '}
          <Text className="text-text-secondary text-sm">(@{profileQ.data?.username ?? '—'})</Text>
        </Text>
        <Text className="text-text-secondary text-xs mt-2">{session?.user.email}</Text>
      </View>

      <Pressable
        onPress={onDeleteAccount}
        className="bg-bg-surface border border-border-subtle rounded-2xl p-4 mb-4 active:opacity-60"
      >
        <Text className="text-text-primary text-sm font-semibold">Delete account</Text>
        <Text className="text-text-secondary text-xs mt-1">Coming in Phase 4.</Text>
      </Pressable>

      <View className="mt-auto pb-6">
        <Button label="Sign out" variant="secondary" onPress={onSignOut} />
      </View>
    </ScreenContainer>
  );
}
