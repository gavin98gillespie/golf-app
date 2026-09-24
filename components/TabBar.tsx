import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlayModeSheet } from '@/components/PlayModeSheet';
import { palette } from '@/theme/linksman';

export type TabName = 'index' | 'profile';
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: palette.ink,
        borderTopWidth: 0.5,
        borderTopColor: palette.bone + '33',
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 12),
        paddingHorizontal: 20,
      }}
    >
      <Tab label="Home" selected={active === 'index'} onPress={() => onSelect('index')} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New round"
        onPress={() => setOpen(true)}
        style={{
          flex: 1,
          minHeight: 48,
          borderRadius: 24,
          backgroundColor: palette.brass,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: palette.ink, fontSize: 16, fontWeight: '600' }}>+ New round</Text>
      </Pressable>
      <Tab label="Me" selected={active === 'profile'} onPress={() => onSelect('profile')} />
      <PlayModeSheet visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}
function Tab({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 5 }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: selected ? '600' : '400',
          color: selected ? palette.bone : palette.sage,
        }}
      >
        {label}
      </Text>
      <View
        style={{ width: 18, height: 2, backgroundColor: selected ? palette.brass : 'transparent' }}
      />
    </Pressable>
  );
}
