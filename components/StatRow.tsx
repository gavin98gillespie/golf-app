import { Text, View } from 'react-native';
import { palette, fontFamily } from '@/theme/linksman';

type Props = { label: string; value: string; sub?: string };

export function StatRow({ label, value, sub }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: palette.ink + '20',
      }}
    >
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 11,
          letterSpacing: 11 * 0.16,
          color: palette.ink,
          opacity: 0.7,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: palette.ink }}>
          {value}
        </Text>
        {sub ? (
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 10,
              color: palette.ink,
              opacity: 0.5,
            }}
          >
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
