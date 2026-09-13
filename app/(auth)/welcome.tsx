import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { fontFamily, palette } from '@/theme/linksman';
export default function Welcome() {
  return (
    <ScreenContainer surface="bone">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'space-between',
          paddingVertical: 32,
        }}
      >
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Wordmark size={44} color={palette.ink} />
        </View>
        <View style={{ marginVertical: 40 }}>
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 34,
              lineHeight: 42,
              textAlign: 'center',
              color: palette.ink,
            }}
          >
            Your round. Your group.
          </Text>
          <Text
            style={{
              fontSize: 18,
              lineHeight: 27,
              textAlign: 'center',
              color: palette.fairway,
              marginTop: 16,
            }}
          >
            Score together. Keep the rivalry going.
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/sign-up')}
            style={{
              backgroundColor: palette.ink,
              borderRadius: 28,
              minHeight: 52,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 17, color: palette.bone }}>Create account</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/sign-in')}
            style={{
              borderWidth: 1,
              borderColor: palette.ink + '55',
              borderRadius: 28,
              minHeight: 52,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 17, color: palette.ink }}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
