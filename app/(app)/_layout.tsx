import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useSession } from '@/lib/hooks/useSession';
import { useMyProfile } from '@/lib/queries/profile';
import { fontFamily, palette } from '@/theme/linksman';

export default function AppLayout() {
  const { session } = useSession();
  const profileQ = useMyProfile(session?.user.id);

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (profileQ.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.sage} />
      </View>
    );
  }

  // A failed fetch is not the same as a missing profile. Bouncing to
  // profile-setup on a network blip would ask an existing user to pick a
  // handle they already have.
  if (profileQ.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>COULD NOT REACH LINKSMAN</Text>
        <Pressable onPress={() => void profileQ.refetch()} hitSlop={12}>
          <Text style={[styles.message, { color: palette.sage, marginTop: 16 }]}>RETRY</Text>
        </Pressable>
      </View>
    );
  }

  if (!profileQ.data) {
    return <Redirect href="/(auth)/profile-setup" />;
  }

  if (!profileQ.data.onboarding_completed) {
    return <Redirect href="/(onboarding)/home-course" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = {
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.ink,
  },
  message: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    letterSpacing: 0.18 * 11,
    color: palette.bone,
    opacity: 0.55,
  },
} as const;
