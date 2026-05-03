import { Modal, Pressable, Text, View } from 'react-native';

import { palette, fontFamily } from '@/theme/linksman';
import { Topo } from '@/components/Topo';

type Props = {
  visible: boolean;
  holeNumber: number;
  drive?: number | null;
  par: number;
  lifetimeCount: number;
  kind: 'eagle' | 'ace' | 'albatross';
  onClose: () => void;
  onSave: () => void;
};

const HEADLINES: Record<'eagle' | 'ace' | 'albatross', string> = {
  eagle: 'Eagle.',
  ace: 'Hole in one.',
  albatross: 'Albatross.',
};

export function EagleCelebration({
  visible,
  holeNumber,
  drive,
  par,
  lifetimeCount,
  kind,
  onClose,
  onSave,
}: Props) {
  const headline = HEADLINES[kind];
  const subline = (() => {
    if (kind === 'ace') return 'A 1 on a par 3.';
    if (kind === 'albatross') return 'Three under. Rare air.';
    if (lifetimeCount === 1) return 'Your first eagle.';
    return `${ordinal(lifetimeCount)} eagle of your life.`;
  })();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.ink }}>
        <View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.4 }}
          pointerEvents="none"
        >
          <Topo
            seed={`eagle-${holeNumber}-${lifetimeCount}`}
            width={400}
            height={900}
            rings={12}
            stroke={palette.sage + '28'}
            strokeBold={palette.sage + '60'}
          />
        </View>

        <Pressable
          onPress={onClose}
          style={{ position: 'absolute', top: 24, right: 24, padding: 8 }}
          hitSlop={12}
        >
          <Text
            style={{ fontFamily: fontFamily.mono, fontSize: 18, color: palette.bone, opacity: 0.6 }}
          >
            ×
          </Text>
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View
            style={{
              flexDirection: 'row',
              gap: 24,
              marginBottom: 16,
              opacity: 0.7,
              alignItems: 'center',
            }}
          >
            <SmallStat label="STROKES" value={String(par - 2)} />
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                letterSpacing: 11 * 0.16,
                color: palette.bone,
                textTransform: 'uppercase',
              }}
            >
              HOLE {holeNumber}
              {drive ? ` · DRIVE ${drive}y` : ''} · PAR {par}
            </Text>
            <SmallStat label="LIFETIME" value={String(lifetimeCount)} />
          </View>

          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 96,
              letterSpacing: -96 * 0.04,
              color: palette.bone,
              lineHeight: 96 * 0.95,
            }}
          >
            {headline}
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.displayItalic,
              fontSize: 18,
              color: palette.bone,
              opacity: 0.85,
              marginTop: 12,
              textAlign: 'center',
              maxWidth: 280,
              lineHeight: 26,
            }}
          >
            {subline}
          </Text>

          <Pressable
            onPress={onSave}
            style={{
              marginTop: 32,
              backgroundColor: palette.sage,
              paddingHorizontal: 32,
              paddingVertical: 14,
              borderRadius: 4,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                letterSpacing: 11 * 0.18,
                color: palette.ink,
                textTransform: 'uppercase',
              }}
            >
              SAVE · CONTINUE
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 9 * 0.18,
          color: palette.bone,
          opacity: 0.55,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text style={{ fontFamily: fontFamily.display, fontSize: 16, color: palette.bone }}>
        {value}
      </Text>
    </View>
  );
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
