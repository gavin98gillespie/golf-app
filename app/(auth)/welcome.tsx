import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { fontFamily, palette } from '@/theme/linksman';

export default function Welcome() {
  return (
    <ScreenContainer surface="bone">
      <View className="flex-1">
        <View className="mt-24 items-center">
          <Wordmark size={56} color={palette.ink} tagline />
        </View>

        <View className="mt-[200px] items-center">
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              letterSpacing: 0.18 * 11,
              color: palette.ink,
              opacity: 0.55,
            }}
          >
            EST. MMXXV · GOLF JOURNAL
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 28,
              color: palette.ink,
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            Quiet. Precise. Earned.
          </Text>
        </View>

        <View className="mt-auto pb-6 gap-3">
          <Pressable
            onPress={() => router.push('/(auth)/sign-up')}
            className="bg-ink rounded-full py-4 items-center"
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 13,
                letterSpacing: 0.18 * 13,
                color: palette.bone,
              }}
            >
              CREATE ACCOUNT
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(auth)/sign-in')}
            className="border border-ink/30 rounded-full py-4 items-center"
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 13,
                letterSpacing: 0.18 * 13,
                color: palette.ink,
              }}
            >
              SIGN IN
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
