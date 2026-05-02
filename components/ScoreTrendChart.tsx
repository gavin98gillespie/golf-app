import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { colors } from '@/theme';

type Point = { id: string; total_score: number; total_par: number; played_at: string };

type Props = {
  points: Point[];
  width: number;
  height: number;
};

/**
 * Hand-rolled SVG line chart. Each point shows total_score over time.
 * The y-axis is auto-fit between the min and max scores in the dataset
 * (with 2-stroke padding on each end).
 *
 * If fewer than 2 points exist, renders an empty-state hint instead.
 */
export function ScoreTrendChart({ points, width, height }: Props) {
  const PAD_LEFT = 28;
  const PAD_RIGHT = 12;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 24;
  const innerW = width - PAD_LEFT - PAD_RIGHT;
  const innerH = height - PAD_TOP - PAD_BOTTOM;

  const layout = useMemo(() => {
    if (points.length < 2) return null;
    const scores = points.map((p) => p.total_score);
    const minScore = Math.min(...scores) - 2;
    const maxScore = Math.max(...scores) + 2;
    const span = Math.max(1, maxScore - minScore);
    const xs = points.map((_, i) => PAD_LEFT + (i * innerW) / Math.max(1, points.length - 1));
    const ys = points.map((p) => PAD_TOP + ((maxScore - p.total_score) / span) * innerH);
    const polyline = xs.map((x, i) => `${x.toFixed(1)},${ys[i]?.toFixed(1) ?? ''}`).join(' ');
    return { xs, ys, polyline, minScore, maxScore };
  }, [points, innerW, innerH]);

  if (!layout) {
    return (
      <View
        style={{ width, height }}
        className="bg-bg-surface border border-border-subtle rounded-2xl items-center justify-center"
      >
        <Text className="text-text-secondary text-sm">Score trend appears after 2+ rounds.</Text>
      </View>
    );
  }

  const { xs, ys, polyline, minScore, maxScore } = layout;

  return (
    <View
      style={{ width, height }}
      className="bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden"
    >
      <Svg width={width} height={height}>
        <Line
          x1={PAD_LEFT}
          x2={width - PAD_RIGHT}
          y1={PAD_TOP}
          y2={PAD_TOP}
          stroke={colors.border.subtle}
          strokeWidth={1}
        />
        <Line
          x1={PAD_LEFT}
          x2={width - PAD_RIGHT}
          y1={height - PAD_BOTTOM}
          y2={height - PAD_BOTTOM}
          stroke={colors.border.subtle}
          strokeWidth={1}
        />
        <SvgText x={4} y={PAD_TOP + 4} fontSize={10} fill={colors.text.secondary}>
          {maxScore}
        </SvgText>
        <SvgText x={4} y={height - PAD_BOTTOM + 4} fontSize={10} fill={colors.text.secondary}>
          {minScore}
        </SvgText>
        <Polyline points={polyline} fill="none" stroke={colors.accent} strokeWidth={2} />
        {points.map((p, i) => {
          const cx = xs[i];
          const cy = ys[i];
          if (cx == null || cy == null) return null;
          return (
            <Circle
              key={p.id}
              cx={cx}
              cy={cy}
              r={3}
              fill={colors.accent}
              stroke={colors.bg.surface}
              strokeWidth={1}
            />
          );
        })}
      </Svg>
      <View className="absolute bottom-2 left-7 right-3 flex-row justify-between">
        <Text className="text-text-secondary text-[10px]">{points.length} rounds</Text>
        <Text className="text-text-secondary text-[10px]">latest →</Text>
      </View>
    </View>
  );
}
