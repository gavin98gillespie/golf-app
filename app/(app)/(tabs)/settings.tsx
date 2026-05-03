import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { signOut } from '@/lib/auth';
import { useSession } from '@/lib/hooks/useSession';
import { useMyProfile } from '@/lib/queries/profile';
import { supabase } from '@/lib/supabase';
import { fontFamily, palette } from '@/theme/linksman';

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

  const legalLinks: { label: string; url: string }[] = [
    {
      label: 'Terms of Service',
      url: 'https://gavin98gillespie.github.io/golf-app/legal/terms.html',
    },
    {
      label: 'Privacy Policy',
      url: 'https://gavin98gillespie.github.io/golf-app/legal/privacy.html',
    },
    { label: 'EULA', url: 'https://gavin98gillespie.github.io/golf-app/legal/eula.html' },
  ];

  return (
    <ScreenContainer surface="bone">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        <View
          style={{
            paddingTop: 8,
            paddingBottom: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottomWidth: 0.5,
            borderBottomColor: palette.ink + '14',
          }}
        >
          <Wordmark size={20} color={palette.ink} />
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                letterSpacing: 11 * 0.16,
                color: palette.ink,
                opacity: 0.6,
                textTransform: 'uppercase',
              }}
            >
              BACK
            </Text>
          </Pressable>
        </View>

        {profileQ.data ? (
          <View
            style={{
              marginTop: 24,
              paddingVertical: 16,
              borderTopWidth: 0.5,
              borderBottomWidth: 0.5,
              borderColor: palette.ink + '33',
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 9,
                letterSpacing: 9 * 0.2,
                color: palette.ink,
                opacity: 0.55,
                textTransform: 'uppercase',
              }}
            >
              SIGNED IN AS
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.display,
                fontSize: 22,
                color: palette.ink,
                marginTop: 6,
              }}
            >
              {profileQ.data.display_name ?? '—'}
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                color: palette.ink,
                opacity: 0.6,
                marginTop: 2,
              }}
            >
              @{profileQ.data.username ?? '—'}
            </Text>
            {session?.user.email ? (
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 11,
                  color: palette.ink,
                  opacity: 0.45,
                  marginTop: 8,
                }}
              >
                {session.user.email}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.2,
            color: palette.ink,
            opacity: 0.55,
            marginTop: 32,
            marginBottom: 4,
            textTransform: 'uppercase',
          }}
        >
          Legal
        </Text>
        {legalLinks.map((row) => (
          <Pressable
            key={row.label}
            onPress={() => openLegal(row.url)}
            style={{
              paddingVertical: 14,
              borderBottomWidth: 0.5,
              borderBottomColor: palette.ink + '20',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 12,
                letterSpacing: 12 * 0.12,
                color: palette.ink,
                textTransform: 'uppercase',
              }}
            >
              {row.label}
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 13,
                color: palette.ink,
                opacity: 0.4,
              }}
            >
              →
            </Text>
          </Pressable>
        ))}

        <View style={{ marginTop: 32 }}>
          <Pressable
            onPress={onSignOut}
            style={{
              backgroundColor: palette.ink,
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 13,
                letterSpacing: 13 * 0.18,
                color: palette.bone,
                textTransform: 'uppercase',
              }}
            >
              SIGN OUT
            </Text>
          </Pressable>
          <Pressable
            onPress={onDeleteAccount}
            style={{ marginTop: 16, alignItems: 'center', paddingVertical: 8 }}
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                letterSpacing: 11 * 0.16,
                color: palette.clay,
                textTransform: 'uppercase',
              }}
            >
              DELETE ACCOUNT
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
