import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { Topo } from '@/components/Topo';
import { HomeCourseCard } from '@/components/HomeCourseCard';
import { LedgerCard } from '@/components/LedgerCard';
import { RegularsPulseCard } from '@/components/RegularsPulseCard';
import { useSession } from '@/lib/hooks/useSession';
import { useMyProfile, useHomeCourse } from '@/lib/queries/profile';
import { useBestCard, useLatestCard, useLatestRegularsPulse } from '@/lib/queries/today';
import { useAchievements } from '@/lib/queries/achievements';
import { palette, fontFamily } from '@/theme/linksman';

export default function Today() {
  const { session } = useSession();
  const userId = session?.user.id;
  const profileQ = useMyProfile(userId);
  const homeCourseQ = useHomeCourse(profileQ.data?.home_course_id);
  const bestQ = useBestCard(userId, profileQ.data?.home_course_id);
  const latestQ = useLatestCard(userId);
  const pulseQ = useLatestRegularsPulse(userId);
  const achievementsQ = useAchievements(userId);

  const trophyCount = achievementsQ.data
    ? achievementsQ.data.eagles + achievementsQ.data.aces + achievementsQ.data.albatrosses
    : 0;

  const todayLabel = format(new Date(), 'MMM d').toUpperCase();
  const dowLabel = format(new Date(), 'EEE').toUpperCase();

  return (
    <ScreenContainer surface="bone">
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.06 }}
      >
        <Topo seed="today" width={400} height={900} stroke={palette.ink + '40'} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            paddingTop: 8,
            paddingBottom: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Wordmark size={20} color={palette.ink} />
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              letterSpacing: 11 * 0.16,
              color: palette.ink,
              opacity: 0.55,
              textTransform: 'uppercase',
            }}
          >
            {dowLabel} · {todayLabel}
          </Text>
        </View>

        <HomeCourseCard course={homeCourseQ.data ?? null} />
        <LedgerCard
          best={bestQ.data}
          latest={latestQ.data}
          achievementsCount={trophyCount}
        />
        <RegularsPulseCard pulse={pulseQ.data} />

        <Pressable
          onPress={() => router.push('/(app)/(tabs)/feed')}
          style={{ paddingVertical: 24 }}
        >
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              letterSpacing: 11 * 0.16,
              color: palette.ink,
              opacity: 0.55,
              textTransform: 'uppercase',
            }}
          >
            OPEN FEED FOR THE REST →
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
