import { useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AccountField } from '@/components/AccountField';
import { useSession } from '@/lib/hooks/useSession';
import { useMyProfile, useUpdateProfile } from '@/lib/queries/profile';
import { ProfileBasicsSchema } from '@/lib/profileForm';
import { explainProfanity } from '@/lib/profanity';
import type { Tables } from '@/lib/supabase';
import { palette, fontFamily } from '@/theme/linksman';

export default function EditProfile() {
  const { session } = useSession();
  const profile = useMyProfile(session?.user.id);
  return (
    <ScreenContainer surface="bone">
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={{ minHeight: 48, justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 16, color: palette.fairway }}>← Back</Text>
      </Pressable>
      {profile.data ? (
        <Form profile={profile.data} />
      ) : (
        <ActivityIndicator color={palette.fairway} />
      )}
    </ScreenContainer>
  );
}
function Form({ profile }: { profile: Tables<'profiles'> }) {
  const [name, setName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateProfile();
  async function save() {
    if (update.isPending) return;
    const parsed = ProfileBasicsSchema.safeParse({ displayName: name, username });
    const message = !parsed.success ? parsed.error.issues[0]?.message : explainProfanity(bio);
    if (!parsed.success || message) {
      setError(message ?? 'Check your details');
      return;
    }
    setError(null);
    Keyboard.dismiss();
    try {
      await update.mutateAsync({
        id: profile.id,
        username: parsed.data.username,
        display_name: parsed.data.displayName,
        bio: bio.trim() || null,
      });
      router.back();
    } catch (e) {
      setError(
        (e as { code?: string }).code === '23505'
          ? 'That username is taken. Try another.'
          : 'Could not save your profile. Please try again.',
      );
    }
  }
  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Text
        style={{
          fontFamily: fontFamily.display,
          fontSize: 32,
          color: palette.ink,
          marginVertical: 20,
        }}
      >
        Edit profile
      </Text>
      <AccountField
        label="Name"
        value={name}
        onChangeText={setName}
        maxLength={60}
        autoComplete="name"
      />
      <AccountField
        label="Username"
        value={username}
        onChangeText={(v) => setUsername(v.toLowerCase())}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={30}
      />
      <AccountField
        label="About you (optional)"
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={280}
        submitBehavior="blurAndSubmit"
        style={{ minHeight: 96, textAlignVertical: 'top' }}
        placeholder="A little about your golf"
      />
      <Text style={{ color: palette.ink + '99', fontSize: 14, marginBottom: 24 }}>
        You can set or change your home course in Settings.
      </Text>
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
        disabled={update.isPending}
        onPress={() => void save()}
        style={{
          backgroundColor: palette.ink,
          borderRadius: 26,
          minHeight: 52,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: palette.bone, fontSize: 17 }}>
          {update.isPending ? 'Saving…' : 'Save changes'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
