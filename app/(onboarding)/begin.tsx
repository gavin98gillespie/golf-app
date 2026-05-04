import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { useCompleteOnboarding, useMyProfile, useHomeCourse } from '@/lib/queries/profile';
import { useSession } from '@/lib/hooks/useSession';
import { palette, fontFamily } from '@/theme/linksman';

export default function OnboardingBegin() {
  const { session } = useSession();
  const profileQ = useMyProfile(session?.user.id);
  const homeCourseQ = useHomeCourse(profileQ.data?.home_course_id);
  const complete = useCompleteOnboarding();

  const courseName = homeCourseQ.data?.name ?? 'Linksman';

  const finish = async () => {
    if (!session?.user.id) return;
    await complete.mutateAsync(session.user.id);
    router.replace('/(app)/(tabs)');
  };

  const datum = (label: string, value: string) => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingVertical: 16,
        borderTopWidth: 0.5,
        borderColor: palette.ink + '22',
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
        {label}
      </Text>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 12,
          color: palette.ink,
          opacity: 0.55,
        }}
      >
        {value}
      </Text>
    </View>
  );

  return (
    <ScreenContainer surface="bone">
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View>
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 9,
              letterSpacing: 9 * 0.2,
              color: palette.ink,
              opacity: 0.55,
              textTransform: 'uppercase',
              marginTop: 24,
            }}
          >
            YOUR LEDGER
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 36,
              letterSpacing: -36 * 0.02,
              color: palette.ink,
              marginTop: 4,
              lineHeight: 36 * 1.05,
            }}
            numberOfLines={2}
          >
            {courseName}
          </Text>

          <View style={{ marginTop: 24 }}>
            {datum('BEST CARD', 'No card yet')}
            {datum('LAST CARD', 'No card yet')}
            {datum('NOTES', 'No notes yet')}
          </View>
        </View>

        <View style={{ paddingBottom: 24 }}>
          <Pressable
            onPress={finish}
            disabled={complete.isPending}
            style={{
              paddingVertical: 16,
              backgroundColor: palette.brass,
              alignItems: 'center',
              opacity: complete.isPending ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 13,
                letterSpacing: 13 * 0.18,
                color: palette.ink,
                textTransform: 'uppercase',
              }}
            >
              CONTINUE →
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
