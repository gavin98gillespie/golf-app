import { Text, View } from 'react-native';
import { palette, fontFamily } from '@/theme/linksman';

type Hole = { score: number; par: number; delta: number };

type Props = {
  holes: Hole[];
  fg?: string;
  compact?: boolean;
};

export function HoleGrid({ holes, fg = palette.bone, compact = false }: Props) {
  const cellHeight = compact ? 22 : 28;
  const fontSize = compact ? 9 : 10;

  const cellColor = (delta: number): { bg: string; txt: string; underdot: boolean } => {
    if (delta <= -2) return { bg: palette.sage, txt: palette.ink, underdot: true };
    if (delta === -1) return { bg: palette.sage + '99', txt: palette.ink, underdot: true };
    if (delta === 0) return { bg: fg + '24', txt: fg, underdot: false };
    if (delta === 1) return { bg: palette.clay + '66', txt: fg, underdot: false };
    return { bg: palette.clay + 'B3', txt: palette.bone, underdot: false };
  };

  const renderCell = (h: Hole, i: number) => {
    const c = cellColor(h.delta);
    return (
      <View
        key={i}
        style={{
          flex: 1,
          height: cellHeight,
          backgroundColor: c.bg,
          borderRadius: 1.5,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          marginHorizontal: 1,
        }}
      >
        <Text
          style={{
            fontFamily: fontFamily.monoBold,
            fontSize,
            color: c.txt,
            fontVariant: ['tabular-nums'],
          }}
        >
          {h.score}
        </Text>
        {c.underdot ? (
          <View
            style={{
              position: 'absolute',
              top: 1,
              right: 2,
              width: 3,
              height: 3,
              backgroundColor: palette.sage,
              borderRadius: 1.5,
            }}
          />
        ) : null}
      </View>
    );
  };

  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);

  return (
    <View
      style={{
        paddingHorizontal: compact ? 16 : 20,
        paddingVertical: compact ? 8 : 10,
        gap: 4,
      }}
    >
      <View style={{ flexDirection: 'row' }}>{front.map(renderCell)}</View>
      {back.length > 0 ? (
        <View style={{ flexDirection: 'row' }}>{back.map(renderCell)}</View>
      ) : null}
      {!compact ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 8,
              letterSpacing: 8 * 0.16,
              color: fg,
              opacity: 0.4,
              textTransform: 'uppercase',
            }}
          >
            F · 1–9
          </Text>
          {back.length > 0 ? (
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 8,
                letterSpacing: 8 * 0.16,
                color: fg,
                opacity: 0.4,
                textTransform: 'uppercase',
              }}
            >
              B · 10–18
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
