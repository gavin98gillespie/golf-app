import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SkinsGamePanel } from '@/components/SkinsGamePanel';
import { palette } from '@/theme/linksman';
export default function Game() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ScreenContainer>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={{ minHeight: 48, justifyContent: 'center' }}
      >
        <Text style={{ color: palette.bone, fontSize: 16 }}>← Back to round</Text>
      </Pressable>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <SkinsGamePanel roundId={id} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
