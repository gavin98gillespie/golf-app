import { Keyboard, Text, TextInput, View, type TextInputProps } from 'react-native';
import { palette } from '@/theme/linksman';
export function AccountField({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: palette.ink, fontSize: 14, marginBottom: 6 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={palette.ink + '88'}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        {...props}
        style={[
          {
            color: palette.ink,
            fontSize: 17,
            minHeight: 48,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: palette.ink + '33',
            borderRadius: 8,
          },
          props.style,
        ]}
      />
    </View>
  );
}
