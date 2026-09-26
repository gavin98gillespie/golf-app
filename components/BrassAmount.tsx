import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { fontFamily, palette } from '@/theme/linksman';

export function BrassCoin({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
      <Circle cx="20" cy="20" r="18" fill={palette.brass} />
      <Circle cx="20" cy="20" r="14" stroke={palette.ink} strokeWidth="1" fill="none" />
      <Path
        d="M15 10v20m0-19h7c8 0 8 9 0 9h-7m7 0c9 0 9 9 0 9h-7M12 14h3m-3 12h3"
        stroke={palette.ink}
        strokeWidth="2"
        fill="none"
      />
    </Svg>
  );
}
export function BrassAmount({
  amount,
  size = 26,
  signed = false,
  light = false,
}: {
  amount: number;
  size?: number;
  signed?: boolean;
  light?: boolean;
}) {
  const formatted = `${signed && amount > 0 ? '+' : ''}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return (
    <View
      accessible
      accessibilityLabel={`${formatted} Brass`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}
    >
      <BrassCoin size={size + 4} />
      <Text
        style={{
          fontFamily: fontFamily.editorial,
          fontSize: size,
          color: light ? palette.ink : palette.brass,
          flexShrink: 1,
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatted}
      </Text>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 10,
          color: light ? palette.fairway : palette.sage,
        }}
      >
        BRASS
      </Text>
    </View>
  );
}
