import { Text, View } from 'react-native';
import { fontFamily } from '@/theme/linksman';

type Props = {
  value: number | string;
  delta?: number | null;
  size?: number;
  color?: string;
  deltaColor?: string;
};

export function ScoreNumeral({ value, delta, size = 96, color = '#F4F0E6', deltaColor }: Props) {
  const sign = delta == null ? '' : delta > 0 ? '+' : delta < 0 ? '−' : 'E';
  const dval = delta == null ? '' : delta === 0 ? '' : Math.abs(delta);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: size * 0.12 }}>
      <Text
        style={{
          fontFamily: fontFamily.display,
          fontSize: size,
          letterSpacing: -size * 0.04,
          color,
          lineHeight: size * 0.9,
          fontVariant: ['tabular-nums', 'lining-nums'],
        }}
      >
        {value}
      </Text>
      {delta != null ? (
        <Text
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
      ) : null}
    </View>
  );
}
