import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { OnboardingUserResult } from '@/components/OnboardingUserResult';
import { OnboardingFooter } from '@/components/OnboardingFooter';
import { useSearchUsers } from '@/lib/queries/users';
import { useSession } from '@/lib/hooks/useSession';
import { palette, fontFamily } from '@/theme/linksman';

export default function OnboardingRegulars() {
  const { session } = useSession();
  const viewerId = session?.user.id;
  const [q, setQ] = useState('');
  const usersQ = useSearchUsers(q, viewerId);
  const advance = () => router.push('/(onboarding)/begin');

  return (
    <ScreenContainer surface="bone">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.2,
            color: palette.ink,
            opacity: 0.55,
            textTransform: 'uppercase',
            marginTop: 16,
          }}
        >
          YOUR REGULARS
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 32,
            letterSpacing: -32 * 0.02,
            color: palette.ink,
            marginTop: 4,
            lineHeight: 32 * 1.05,
          }}
        >
          Who do you play with?
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 12,
            color: palette.ink,
            opacity: 0.6,
            marginTop: 8,
            lineHeight: 18,
          }}
        >
          {'Follow people you actually play with. Their rounds will appear in your feed.'}
        </Text>

        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by username or name"
          placeholderTextColor={palette.ink + '55'}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            fontFamily: fontFamily.editorial ?? fontFamily.display,
            fontSize: 18,
            color: palette.ink,
            paddingVertical: 12,
            marginTop: 24,
            borderBottomWidth: 0.5,
            borderBottomColor: palette.ink + '33',
          }}
        />

        <View style={{ marginTop: 16 }}>
          {viewerId
            ? (usersQ.data ?? []).map((u) => (
                <OnboardingUserResult key={u.id} user={u} viewerId={viewerId} />
              ))
            : null}
          {q.trim().length >= 2 && (usersQ.data ?? []).length === 0 ? (
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 12,
                color: palette.ink,
                opacity: 0.55,
                marginTop: 8,
              }}
            >
              No matches.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <Pressable
        onPress={advance}
        style={{
          marginBottom: 16,
          paddingVertical: 16,
          backgroundColor: palette.fairway,
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
          CONTINUE →
        </Text>
      </Pressable>
      <OnboardingFooter onSkip={advance} />
    </ScreenContainer>
  );
}
