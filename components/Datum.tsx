import { Text, View } from 'react-native';
import { fontFamily } from '@/theme/linksman';

type Props = {
  label: string;
  value: string | number;
  color?: string;
  valueColor?: string;
  align?: 'left' | 'center' | 'right';
};

export function Datum({ label, value, color = '#F4F0E6', valueColor, align = 'left' }: Props) {
  const alignItems = align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';
  return (
    <View style={{ alignItems, gap: 4 }}>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 9 * 0.18,
          color,
          opacity: 0.55,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 13,
          letterSpacing: 13 * 0.02,
          color: valueColor ?? color,
          fontVariant: ['tabular-nums'],
        }}
      >
        {String(value)}
      </Text>
    </View>
  );
}
