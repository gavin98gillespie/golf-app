import { TextInput, View, Text } from 'react-native';
import type { TextInputProps } from 'react-native';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function Input({ label, error, ...rest }: Props) {
  return (
    <View className="mb-4">
      <Text className="text-text-secondary text-xs uppercase tracking-wider mb-2">{label}</Text>
      <TextInput
        placeholderTextColor="#4a5a52"
        {...rest}
        className={`bg-bg-elevated border rounded-xl px-4 py-3 text-text-primary text-base ${
          error ? 'border-red-500' : 'border-border-subtle'
        }`}
      />
      {error ? <Text className="text-red-500 text-xs mt-1">{error}</Text> : null}
    </View>
  );
}
