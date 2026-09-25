import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import type { GameKind } from '@/lib/gameRules';
import { palette } from '@/theme/linksman';

export function GameEmblem({
  kind,
  color = palette.brass,
  size = 32,
}: {
  kind: GameKind | 'ledger' | 'round';
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
      {kind === 'skins' ? (
        <>
          <Ellipse cx={20} cy={12} rx={12} ry={5} stroke={color} strokeWidth={1.5} fill="none" />
          <Path
            d="M8 12v7c0 7 24 7 24 0v-7M8 20v7c0 7 24 7 24 0v-7M14 17v5m6-4v5m6-6v5"
            stroke={color}
            strokeWidth={1.5}
            fill="none"
          />
        </>
      ) : kind === 'closest' ? (
        <>
          <Circle cx={20} cy={22} r={13} stroke={color} strokeWidth={1.2} fill="none" />
          <Circle cx={20} cy={22} r={7} stroke={color} strokeWidth={1.2} fill="none" />
          <Path
            d="M20 24V4l11 5-11 5"
            stroke={color}
            strokeWidth={1.7}
            strokeLinejoin="round"
            fill="none"
          />
          <Circle cx={16} cy={25} r={2} fill={color} />
        </>
      ) : kind === 'drive' ? (
        <>
          <Path
            d="M7 29C10 10 25 7 33 12M6 35h8M10 35v-5M26 28l4 6M25 35h8"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx={10} cy={26} r={3} stroke={color} strokeWidth={1.5} fill="none" />
          <Circle cx={33} cy={12} r={2} fill={color} />
        </>
      ) : kind === 'custom' ? (
        <>
          <Path
            d="m20 4 6 10 10 6-10 6-6 10-6-10-10-6 10-6Z"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            fill="none"
          />
          <Path d="M20 14v12M14 20h12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </>
      ) : kind === 'ledger' ? (
        <>
          <Rect
            x={8}
            y={5}
            width={25}
            height={30}
            rx={3}
            stroke={color}
            strokeWidth={1.5}
            fill="none"
          />
          <Path
            d="M14 5v30M19 13h9M19 20h9M19 27h5M5 12h5M5 20h5M5 28h5"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <Path
            d="M16 31V5l16 6-16 7"
            stroke={color}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d="M11 28c-5 1-7 3-7 5 0 5 27 5 27 0 0-2-3-4-8-5"
            stroke={color}
            strokeWidth={1.3}
            fill="none"
          />
        </>
      )}
    </Svg>
  );
}
