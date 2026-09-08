import { useRef, useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { palette } from '@/theme/linksman';

/** A visible dismissal control works even when iOS omits the accessory toolbar. */
export function SearchField({
  surface = 'ink',
  style,
  ...props
}: TextInputProps & { surface?: 'ink' | 'bone' }) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const dismiss = () => {
    input.current?.blur();
    Keyboard.dismiss();
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
      <TextInput
        {...props}
        ref={input}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        returnKeyType="done"
        onSubmitEditing={dismiss}
        style={[style, { flex: 1, minWidth: 0, minHeight: 52 }]}
      />
      {focused && (
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Close search keyboard"
          style={{ minWidth: 56, minHeight: 52, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text
            style={{
              color: surface === 'ink' ? palette.sage : palette.fairway,
              fontSize: 17,
              fontWeight: '600',
            }}
          >
            Done
          </Text>
        </Pressable>
      )}
    </View>
  );
}
