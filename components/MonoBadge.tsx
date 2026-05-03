import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontFamily } from '@/theme/linksman';

type Props = PropsWithChildren<{
  color?: string;
  bg?: string;
  border?: boolean;
}>;

export function MonoBadge({ children, color = '#0E1410', bg = '#F4F0E6', border = true }: Props) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderWidth: border ? StyleSheet.hairlineWidth : 0,
        borderColor: `${color}33`,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 2,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 10,
          letterSpacing: 10 * 0.14,
          color,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Text>
    </View>
  );
}
