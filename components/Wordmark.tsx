import { Text, View } from 'react-native';
import Svg, { Rect, Line, Path } from 'react-native-svg';

import { fontFamily } from '@/theme/linksman';

type Props = { size?: number; color?: string; tagline?: boolean };

export function Wordmark({ size = 36, color = '#F4F0E6', tagline = false }: Props) {
  const h = size;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: size * 0.18 }}>
      <Svg width={h * 0.78} height={h} viewBox="0 0 78 100">
        <Rect x={14} y={8} width={6} height={84} fill={color} />
        <Rect x={14} y={86} width={58} height={6} fill={color} />
        <Line x1={0} y1={58} x2={78} y2={58} stroke={color} strokeWidth={1.2} />
        <Path d="M72,52 L78,54 L72,56 Z" fill={color} />
      </Svg>
      <Text
        style={{
          fontFamily: fontFamily.display,
          fontSize: size * 0.85,
          letterSpacing: -size * 0.85 * 0.02,
          color,
          lineHeight: size * 0.85,
        }}
      >
        Linksman
      </Text>
      {tagline ? (
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: size * 0.22,
            letterSpacing: 1.6,
            color,
            opacity: 0.6,
            marginLeft: size * 0.4,
          }}
        >
          EST. MMXXV
        </Text>
      ) : null}
    </View>
  );
}
