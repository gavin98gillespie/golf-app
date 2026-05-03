import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { AchievementCard } from '@/components/AchievementCard';
import { useAchievements } from '@/lib/queries/achievements';
import { useSession } from '@/lib/hooks/useSession';
import { palette, fontFamily } from '@/theme/linksman';

export default function Achievements() {
  const { session } = useSession();
  const q = useAchievements(session?.user.id);
  const a = q.data;

  return (
    <ScreenContainer surface="bone">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
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

        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 36,
            color: palette.ink,
            marginTop: 16,
          }}
        >
          Trophy case
        </Text>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
          <AchievementCard label="EAGLES" count={a?.eagles ?? 0} firstAt={a?.firstEagleAt} />
          <AchievementCard label="ACES" count={a?.aces ?? 0} firstAt={a?.firstAceAt} />
          <AchievementCard label="ALBATROSS" count={a?.albatrosses ?? 0} />
        </View>

        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.2,
            color: palette.ink,
            opacity: 0.55,
            textTransform: 'uppercase',
            marginTop: 40,
            marginBottom: 4,
          }}
        >
          Course bests
        </Text>
        {(a?.courseBests ?? []).map((cb) => (
          <Pressable
            key={cb.course_id}
            onPress={() =>
              router.push({ pathname: '/round/[id]', params: { id: cb.round_id } })
            }
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
              style={{ fontFamily: fontFamily.display, fontSize: 18, color: palette.ink, flex: 1 }}
            >
              {cb.course_name}
            </Text>
            <Text style={{ fontFamily: fontFamily.display, fontSize: 22, color: palette.ink }}>
              {cb.total_score}
            </Text>
          </Pressable>
        ))}
        {(a?.courseBests ?? []).length === 0 ? (
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              color: palette.ink,
              opacity: 0.55,
              marginTop: 16,
            }}
          >
            Save your first round to unlock your trophy case.
          </Text>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
