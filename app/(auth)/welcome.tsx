import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';

export default function Welcome() {
  return (
    <ScreenContainer>
      <View className="flex-1 justify-center">
        <Text className="text-text-primary text-5xl font-light tracking-tight">Golf App</Text>
        <Text className="text-text-secondary text-base mt-3 leading-6">
          Track your scorecards. Follow your friends. See where the day takes you.
        </Text>
      </View>
      <View className="pb-6 gap-3">
        <Button label="Get started" onPress={() => router.push('/(auth)/sign-up')} />
        <Button
          label="I have an account"
          variant="secondary"
          onPress={() => router.push('/(auth)/sign-in')}
        />
      </View>
    </ScreenContainer>
  );
}
