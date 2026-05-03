import { Text, View } from 'react-native';
import { palette, fontFamily } from '@/theme/linksman';

type Props = {
  label: string;
  count: number;
  firstAt?: string | null | undefined;
  symbol?: string | undefined;
};

export function AchievementCard({ label, count, firstAt, symbol = '◆' }: Props) {
  const muted = count === 0;
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 18,
        paddingHorizontal: 14,
        borderWidth: 0.5,
        borderColor: palette.ink + '33',
        opacity: muted ? 0.4 : 1,
      }}
    >
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 14,
          color: muted ? palette.ink : palette.brass,
        }}
      >
        {symbol}
      </Text>
      <Text
        style={{
          fontFamily: fontFamily.display,
          fontSize: 32,
          color: palette.ink,
          marginTop: 8,
        }}
      >
        {count}
      </Text>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 9 * 0.2,
          color: palette.ink,
          opacity: 0.6,
          textTransform: 'uppercase',
          marginTop: 4,
        }}
      >
        {label}
      </Text>
      {firstAt && count > 0 ? (
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            color: palette.ink,
            opacity: 0.45,
            marginTop: 2,
          }}
        >
          first {new Date(firstAt).toLocaleDateString()}
        </Text>
      ) : null}
    </View>
  );
}
