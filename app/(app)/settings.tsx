import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { signOut } from '@/lib/auth';
import { useSession } from '@/lib/hooks/useSession';
import { useMyProfile } from '@/lib/queries/profile';
import { supabase } from '@/lib/supabase';

export default function Settings() {
  const { session } = useSession();
  const profileQ = useMyProfile(session?.user.id);

  const openLegal = (url: string) => WebBrowser.openBrowserAsync(url);

  async function onSignOut() {
    await signOut();
    router.replace('/(auth)/welcome');
  }

  function onDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This permanently removes your profile, rounds, comments, and follows. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.functions.invoke('delete-account', {
              method: 'POST',
            });
            if (error) {
              Alert.alert('Could not delete', error.message);
              return;
            }
            await supabase.auth.signOut();
            router.replace('/(auth)/welcome');
          },
        },
      ],
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

      <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-8 mb-2">
        Legal
      </Text>
      <Pressable
        onPress={() => openLegal('https://gavin98gillespie.github.io/golf-app/legal/terms')}
        className="py-3 active:opacity-70"
      >
        <Text className="text-text-primary text-sm">Terms of Service</Text>
      </Pressable>
      <Pressable
        onPress={() => openLegal('https://gavin98gillespie.github.io/golf-app/legal/privacy')}
        className="py-3 active:opacity-70"
      >
        <Text className="text-text-primary text-sm">Privacy Policy</Text>
      </Pressable>
      <Pressable
        onPress={() => openLegal('https://gavin98gillespie.github.io/golf-app/legal/eula')}
        className="py-3 active:opacity-70"
      >
        <Text className="text-text-primary text-sm">EULA</Text>
      </Pressable>

      <View className="mt-auto pb-6">
        <Button label="Sign out" variant="secondary" onPress={onSignOut} />
        <Pressable
          onPress={() => {
            throw new Error('Sentry test crash');
          }}
          className="mt-4 active:opacity-70"
        >
          <Text className="text-text-secondary text-xs">[dev] Trigger test error</Text>
        </Pressable>
        <Pressable onPress={onDeleteAccount} className="mt-6 active:opacity-70">
          <Text className="text-red-500 text-sm font-semibold text-center">Delete account</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
