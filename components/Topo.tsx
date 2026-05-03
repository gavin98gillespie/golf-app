import { useMemo } from 'react';
import Svg, { Path, G, Line, Circle } from 'react-native-svg';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function loop(
  rand: () => number,
  cx: number,
  cy: number,
  baseR: number,
  jitter: number,
  points = 64,
): [number, number][] {
  const phases = Array.from({ length: 5 }, () => rand() * Math.PI * 2);
  const amps = [1.0, 0.55, 0.32, 0.18, 0.1];
  const freqs = [1, 2, 3, 5, 8];
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const t = (i / points) * Math.PI * 2;
    let n = 0;
    for (let k = 0; k < phases.length; k++) {
      n += Math.sin(t * freqs[k]! + phases[k]!) * amps[k]!;
    }
    n /= 2.15;
    const r = baseR * (1 + n * jitter);
    pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
  }
  return pts;
}

function pathFromLoop(pts: [number, number][]): string {
  let d = `M${pts[0]![0].toFixed(1)},${pts[0]![1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += `L${pts[i]![0].toFixed(1)},${pts[i]![1].toFixed(1)}`;
  }
  return d + 'Z';
}

type Props = {
  seed: string;
  width?: number;
  height?: number;
  rings?: number;
  stroke?: string;
  strokeBold?: string;
  greenColor?: string | null;
  jitter?: number;
  showPin?: boolean;
  pinColor?: string;
};

export function Topo({
  seed,
  width = 400,
  height = 240,
  rings = 8,
  stroke = 'rgba(244,240,230,0.18)',
  strokeBold = 'rgba(244,240,230,0.32)',
  greenColor = null,
  jitter = 0.18,
  showPin = false,
  pinColor = '#9BB89A',
}: Props) {
  const data = useMemo(() => {
    const s = hashStr(seed);
    const r = rng(s);
    const cx = width * (0.35 + r() * 0.3);
    const cy = height * (0.4 + r() * 0.3);
    const baseR = Math.min(width, height) * (0.18 + r() * 0.06);
    const loops: [number, number][][] = [];
    for (let i = 0; i < rings; i++) {
      const ringR = baseR + i * (Math.min(width, height) * 0.07);
      loops.push(loop(r, cx, cy, ringR, jitter * (1 + i * 0.05), 96));
    }
    const px = cx + (r() - 0.5) * baseR * 0.3;
    const py = cy + (r() - 0.5) * baseR * 0.3;
    return { loops, px, py };
  }, [seed, width, height, rings, jitter]);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.loops.map((pts, i) => (
        <Path
          key={i}
          d={pathFromLoop(pts)}
          fill={i === 0 && greenColor ? greenColor : 'none'}
          stroke={i === 0 ? strokeBold : stroke}
          strokeWidth={i === 0 ? 1.2 : 0.7}
          opacity={i === 0 ? 0.95 : 0.6 + (i / data.loops.length) * 0.3}
        />
      ))}
      {showPin ? (
        <G>
          <Line
            x1={data.px}
            y1={data.py}
            x2={data.px}
            y2={data.py - 22}
            stroke={pinColor}
            strokeWidth={1}
          />
          <Path
            d={`M${data.px},${data.py - 22} L${data.px + 8},${data.py - 19} L${data.px},${data.py - 16} Z`}
            fill={pinColor}
          />
          <Circle cx={data.px} cy={data.py} r={1.6} fill={pinColor} />
        </G>
      ) : null}
    </Svg>
  );
}
