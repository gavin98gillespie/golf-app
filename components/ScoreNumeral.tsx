import { Text, View } from 'react-native';
import { fontFamily } from '@/theme/linksman';

type Props = {
  value: number | string;
  delta?: number | null;
  size?: number;
  color?: string;
  deltaColor?: string;
  /** When true, render delta below the value (vertical stack) instead of beside it. */
  stack?: boolean;
};

export function ScoreNumeral({
  value,
  delta,
  size = 96,
  color = '#F4F0E6',
  deltaColor,
  stack = false,
}: Props) {
  const sign = delta == null ? '' : delta > 0 ? '+' : delta < 0 ? '−' : 'E';
  const dval = delta == null ? '' : delta === 0 ? '' : Math.abs(delta);

  const valueText = (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      style={{
        fontFamily: fontFamily.display,
        fontSize: size,
        letterSpacing: -size * 0.04,
        color,
        lineHeight: size * 0.95,
        fontVariant: ['tabular-nums', 'lining-nums'],
        flexShrink: 1,
      }}
    >
      {value}
    </Text>
  );

  const deltaText =
    delta != null ? (
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fontFamily.mono,
          fontSize: size * 0.22,
          letterSpacing: size * 0.22 * 0.04,
          color: deltaColor ?? color,
          opacity: 0.85,
        }}
      >
        {sign}
        {dval}
      </Text>
    ) : null;

  if (stack) {
    return (
      <View style={{ alignItems: 'flex-start', flexShrink: 1 }}>
        {valueText}
        {deltaText}
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: size * 0.12,
        flexShrink: 1,
      }}
    >
      {valueText}
      {deltaText}
    </View>
  );
}
