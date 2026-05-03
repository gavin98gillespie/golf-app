import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = PropsWithChildren<{ surface?: 'ink' | 'bone' }>;

export function ScreenContainer({ children, surface = 'ink' }: Props) {
  const bg = surface === 'bone' ? 'bg-bone' : 'bg-ink';
  return (
    <SafeAreaView className={`flex-1 ${bg}`}>
      <View className="flex-1 px-6">{children}</View>
    </SafeAreaView>
  );
}
