import { Text, View } from 'react-native';
import { colors } from '@/theme';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-bg-base">
      <Text className="text-text-primary text-5xl font-light tracking-tight">Hello, Golf</Text>
      <Text className="text-text-secondary text-sm mt-2 tracking-wider uppercase">
        Phase 0 · Setup
      </Text>
      <View
        className="mt-6 px-3 py-1 rounded-full"
        style={{ backgroundColor: colors.accentSoft, borderColor: colors.accent, borderWidth: 1 }}
      >
        <Text className="text-xs" style={{ color: colors.accent }}>
          v0.0.1
        </Text>
      </View>
    </View>
  );
}
