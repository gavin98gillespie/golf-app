import { Text, View } from 'react-native';
import { palette, fontFamily } from '@/theme/linksman';

type Props = { label: string; value: string; sub?: string; surface?: 'ink' | 'bone' };

export function StatRow({ label, value, sub, surface = 'bone' }: Props) {
  const fg = surface === 'ink' ? palette.bone : palette.ink;
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: fg + '20',
      }}
    >
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 11,
          letterSpacing: 11 * 0.16,
          color: fg,
          opacity: 0.7,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: fg }}>{value}</Text>
        {sub ? (
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 10,
              color: fg,
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
