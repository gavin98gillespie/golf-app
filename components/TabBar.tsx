import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Line } from 'react-native-svg';

import { PlayModeSheet } from '@/components/PlayModeSheet';
import { palette, fontFamily } from '@/theme/linksman';

type TabName = 'index' | 'discover' | 'profile' | 'settings';

type TabItem = {
  name: TabName;
  label: string;
};

const ITEMS: TabItem[] = [
  { name: 'index', label: 'Feed' },
  { name: 'discover', label: 'Discover' },
  { name: 'profile', label: 'Me' },
  { name: 'settings', label: 'Settings' },
];

type Props = { active: TabName };

export function TabBar({ active }: Props) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 30,
        backgroundColor: palette.ink + 'EE',
        borderTopWidth: 0.5,
        borderTopColor: palette.bone + '1A',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {ITEMS.slice(0, 2).map((it) => (
        <View key={it.name} style={{ flex: 1, alignItems: 'center' }}>
          <TabCell item={it} active={active === it.name} />
        </View>
      ))}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <PlayButton />
      </View>
      {ITEMS.slice(2).map((it) => (
        <View key={it.name} style={{ flex: 1, alignItems: 'center' }}>
          <TabCell item={it} active={active === it.name} />
        </View>
      ))}
    </View>
  );
}

function TabCell({ item, active }: { item: TabItem; active: boolean }) {
  const onPress = () => {
    if (item.name === 'index') router.replace('/(app)/(tabs)');
    else if (item.name === 'discover') router.replace('/(app)/(tabs)/discover');
    else if (item.name === 'profile') router.replace('/(app)/(tabs)/profile');
    else if (item.name === 'settings') router.replace('/(app)/(tabs)/settings');
  };
  return (
    <Pressable
      onPress={onPress}
      style={{ alignItems: 'center', gap: 4, opacity: active ? 1 : 0.4 }}
    >
      <View
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: palette.bone,
          opacity: active ? 1 : 0,
        }}
      />
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 9 * 0.16,
          color: palette.bone,
          textTransform: 'uppercase',
        }}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

function PlayButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: palette.brass,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: palette.brass,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
        }}
      >
        <Svg width={22} height={22} viewBox="0 0 22 22">
          <Circle cx={11} cy={6} r={3} fill={palette.ink} />
          <Line x1={11} y1={9} x2={11} y2={16} stroke={palette.ink} strokeWidth={1.4} />
          <Line x1={7} y1={16} x2={15} y2={16} stroke={palette.ink} strokeWidth={1.4} />
        </Svg>
      </Pressable>
      <PlayModeSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
