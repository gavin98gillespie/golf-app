import { Pressable, Text, View } from 'react-native';

import { palette, fontFamily } from '@/theme/linksman';

type Props = {
  onSkip?: () => void;
  skipLabel?: string;
};

export function OnboardingFooter({ onSkip, skipLabel = 'Skip for now' }: Props) {
  if (!onSkip) return null;
  return (
    <View style={{ alignItems: 'center', paddingVertical: 16 }}>
      <Pressable
        onPress={onSkip}
        hitSlop={12}
        style={{ paddingVertical: 8, paddingHorizontal: 12 }}
      >
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 11,
            letterSpacing: 11 * 0.18,
            color: palette.ink,
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
