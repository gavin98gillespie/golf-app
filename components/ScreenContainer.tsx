import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette } from '@/theme/linksman';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = PropsWithChildren<{ surface?: 'ink' | 'bone' }>;

export function ScreenContainer({ children, surface = 'ink' }: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette[surface] }}>
      <StatusBar style={surface === 'bone' ? 'dark' : 'light'} />
      <View style={{ flex: 1, paddingHorizontal: 24 }}>{children}</View>
    </SafeAreaView>
  );
}
