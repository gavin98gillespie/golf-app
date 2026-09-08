import { InputAccessoryView, Keyboard, Platform, Pressable, Text, View } from 'react-native';
import { palette } from '@/theme/linksman';

/** iPhone search fields need an explicit dismissal action above the keyboard. */
export function KeyboardDoneAccessory({ id }: { id: string }) {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={id}>
      <View
        style={{
          backgroundColor: palette.bone,
          alignItems: 'flex-end',
          borderTopWidth: 1,
          borderTopColor: palette.ink + '22',
        }}
      >
        <Pressable
          onPress={Keyboard.dismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss keyboard"
          style={{ minHeight: 44, paddingHorizontal: 24, justifyContent: 'center' }}
        >
          <Text style={{ color: palette.fairway, fontSize: 17, fontWeight: '600' }}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}
