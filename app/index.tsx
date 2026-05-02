import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-bg-base">
      <Text className="text-text-primary text-5xl font-light tracking-tight">
        Hello, Golf
      </Text>
      <Text className="text-text-secondary text-sm mt-2 tracking-wider uppercase">
        Phase 0 · Setup
      </Text>
    </View>
  );
}
