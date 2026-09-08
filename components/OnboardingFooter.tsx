import { Pressable, Text, View } from 'react-native';

import { palette, fontFamily } from '@/theme/linksman';

type Props = {
  onSkip?: () => void;
  disabled?: boolean;
  skipLabel?: string;
  surface?: 'ink' | 'bone';
};

export function OnboardingFooter({
  onSkip,
  skipLabel = 'Skip for now',
  surface = 'bone',
  disabled,
}: Props) {
  if (!onSkip) return null;
  return (
    <View style={{ alignItems: 'center', paddingVertical: 16 }}>
      <Pressable
        onPress={onSkip}
        disabled={disabled}
        accessibilityState={{ disabled: !!disabled }}
        accessibilityRole="button"
        hitSlop={12}
        style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}
      >
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 11,
            letterSpacing: 11 * 0.18,
            color: surface === 'ink' ? palette.bone : palette.ink,
            opacity: 0.55,
            textTransform: 'uppercase',
          }}
        >
          {skipLabel}
        </Text>
      </Pressable>
    </View>
  );
}
