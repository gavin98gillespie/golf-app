import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ScreenContainer({ children }: PropsWithChildren) {
  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="flex-1 px-6">{children}</View>
    </SafeAreaView>
  );
}
