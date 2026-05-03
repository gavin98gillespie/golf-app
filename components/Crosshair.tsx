import Svg, { Line } from 'react-native-svg';

type Props = { size?: number; color?: string; opacity?: number };

export function Crosshair({ size = 8, color = '#F4F0E6', opacity = 0.6 }: Props) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} opacity={opacity}>
      <Line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke={color} strokeWidth={0.7} />
      <Line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke={color} strokeWidth={0.7} />
    </Svg>
  );
}
