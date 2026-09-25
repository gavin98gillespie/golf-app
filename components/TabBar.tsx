import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlayModeSheet } from '@/components/PlayModeSheet';
import { fontFamily, palette } from '@/theme/linksman';

export type TabName = 'index' | 'games' | 'profile';
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
    <View style={{ backgroundColor: palette.ink }}>
      <View
        style={{
          backgroundColor: palette.ink,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 0.5,
          borderColor: palette.bone + '24',
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingHorizontal: 24,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', minHeight: 70 }}>
          <Tab
            name="index"
            label="Home"
            selected={active === 'index'}
            onPress={() => onSelect('index')}
          />
          <View style={{ flex: 1, alignItems: 'center', marginTop: -22 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New round"
              onPress={() => setOpen(true)}
              style={({ pressed }) => ({
                alignItems: 'center',
                gap: 7,
                transform: [{ scale: pressed ? 0.95 : 1 }],
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 33,
                  backgroundColor: palette.ink,
                  padding: 4,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 29,
                    backgroundColor: palette.brass,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: palette.brass,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.22,
                    shadowRadius: 10,
                    elevation: 3,
                  }}
                >
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      inset: 4,
                      borderRadius: 25,
                      borderWidth: 0.5,
                      borderColor: palette.bone + '55',
                    }}
                  />
                  <Svg width={28} height={28} viewBox="0 0 28 28" accessible={false}>
                    <Path
                      d="M10 22V5L22 9.5 10 14"
                      stroke={palette.ink}
                      strokeWidth={1.7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <Path
                      d="M7 20c-2 .5-3 1.2-3 2 0 1.7 4 3 9 3s9-1.3 9-3c0-1.2-2-2.2-5-2.7"
                      stroke={palette.ink}
                      strokeWidth={1.3}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </Svg>
                </View>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel="Games"
              accessibilityState={{ selected: active === 'games' }}
              onPress={() => onSelect('games')}
              style={{
                minHeight: 44,
                minWidth: 80,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 11,
                  letterSpacing: 0.8,
                  color: active === 'games' ? palette.brass : palette.sage,
                }}
              >
                GAMES
              </Text>
            </Pressable>
          </View>
          <Tab
            name="profile"
            label="Me"
            selected={active === 'profile'}
            onPress={() => onSelect('profile')}
          />
        </View>
        <PlayModeSheet visible={open} onClose={() => setOpen(false)} />
      </View>
    </View>
  );
}
function Tab({
  name,
  label,
  selected,
  onPress,
}: {
  name: TabName;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const color = selected ? palette.brass : palette.sage;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 64,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Svg width={23} height={23} viewBox="0 0 24 24" accessible={false}>
        {name === 'index' ? (
          <Path
            d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            fill={selected ? palette.brass + '18' : 'none'}
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
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 11,
          letterSpacing: 0.8,
          color: selected ? palette.bone : palette.sage,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}
