import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlayModeSheet } from '@/components/PlayModeSheet';
import { fontFamily, palette } from '@/theme/linksman';

export type TabName = 'index' | 'games' | 'profile';
type ItemName = TabName | 'play';
export function TabBar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (name: TabName) => void;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: palette.ink,
        borderTopWidth: 0.5,
        borderColor: palette.bone + '24',
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 12),
        paddingHorizontal: 12,
      }}
    >
      <View style={{ flexDirection: 'row' }}>
        {(['index', 'play', 'games', 'profile'] as const).map((name) => (
          <NavItem
            key={name}
            name={name}
            selected={name === 'play' ? open : active === name}
            onPress={() => (name === 'play' ? setOpen(true) : onSelect(name))}
          />
        ))}
      </View>
      <PlayModeSheet visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}
function NavItem({
  name,
  selected,
  onPress,
}: {
  name: ItemName;
  selected: boolean;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const medal = name === 'play' || name === 'games';
  const filled = name === 'play' || (name === 'games' && selected);
  const color = filled ? palette.ink : selected || medal ? palette.brass : palette.sage;
  const label = { index: 'Home', play: 'Play', games: 'Games', profile: 'Me' }[name];
  return (
    <Pressable
      accessibilityRole={name === 'play' ? 'button' : 'tab'}
      accessibilityLabel={label}
      accessibilityHint={name === 'play' ? 'Start a new round' : undefined}
      accessibilityState={{ selected }}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 7,
        paddingVertical: 2,
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: filled ? palette.brass : medal ? palette.graphite : 'transparent',
          borderWidth: medal ? 1 : 0,
          borderColor: palette.brass + '88',
        }}
      >
        {medal && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              inset: 4,
              borderRadius: 20,
              borderWidth: 0.5,
              borderColor: filled ? palette.bone + '55' : palette.brass + '33',
            }}
          />
        )}
        <Svg width={25} height={25} viewBox="0 0 24 24" accessible={false}>
          {name === 'index' ? (
            <Path
              d="m3 10 9-7 9 7v10H15v-7H9v7H3Z"
              stroke={color}
              strokeWidth={1.5}
              strokeLinejoin="round"
              fill="none"
            />
          ) : name === 'play' ? (
            <Path
              d="M8 21V3l12 4.5L8 12M4 21h9"
              stroke={color}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : name === 'games' ? (
            <Path
              d="M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H3v2a4 4 0 0 0 4 4M17 5h4v2a4 4 0 0 1-4 4M12 14v6M7 21h10"
              stroke={color}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : (
            <>
              <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={1.5} fill="none" />
              <Path
                d="M4 21v-2a8 6 0 0 1 16 0v2"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                fill="none"
              />
            </>
          )}
        </Svg>
      </View>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 11,
          letterSpacing: 0.5,
          color: selected ? palette.bone : palette.sage,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}
