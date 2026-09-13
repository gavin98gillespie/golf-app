import { InputAccessoryView, Keyboard, Platform, Pressable, Text, View } from 'react-native';
import { palette } from '@/theme/linksman';
/** A native Done control for number pads and multiline fields, without adding another search label. */
export function KeyboardToolbar({ id, surface = 'ink' }: { id: string; surface?: 'ink' | 'bone' }) {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={id}>
      <View
        style={{
          backgroundColor: surface === 'ink' ? palette.graphite : palette.bone,
          alignItems: 'flex-end',
          paddingHorizontal: 24,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close keyboard"
          onPress={Keyboard.dismiss}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}
        >
          <Text style={{ fontSize: 17, color: surface === 'ink' ? palette.bone : palette.fairway }}>
            Done
          </Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}
