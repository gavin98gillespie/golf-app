import { Pressable, Text, ActivityIndicator } from 'react-native';

type Variant = 'primary' | 'secondary';

type Props = {
  onPress: () => void;
  label: string;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ onPress, label, variant = 'primary', disabled, loading }: Props) {
  const isDisabled = disabled || loading;
  const base = 'rounded-full px-6 py-4 items-center justify-center';
  const colors =
    variant === 'primary'
      ? isDisabled
        ? 'bg-border-subtle'
        : 'bg-accent active:opacity-80'
      : isDisabled
        ? 'border border-border-subtle'
        : 'border border-text-secondary active:opacity-70';
  const textColor = variant === 'primary' ? 'text-bg-base' : 'text-text-primary';

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      className={`${base} ${colors}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text className={`${textColor} font-semibold text-base`}>{label}</Text>
      )}
    </Pressable>
  );
}
