import { Text, View } from 'react-native';

import { colors } from '@/theme';
import type { Tables } from '@/lib/supabase';

type Props = {
  holes: Tables<'round_holes'>[];
  totalHoles: number;
};

function categoryFor(score: number, par: number): 'birdie' | 'par' | 'bogey' {
  const diff = score - par;
  if (diff < 0) return 'birdie';
  if (diff === 0) return 'par';
  return 'bogey';
}

const COLOR_MAP = {
  birdie: { bg: colors.accent, fg: colors.bg.base },
  par: { bg: colors.text.secondary, fg: colors.bg.base },
  bogey: { bg: colors.border.subtle, fg: colors.text.primary },
} as const;

export function HoleScoreGrid({ holes, totalHoles }: Props) {
  const byNumber = new Map(holes.map((h) => [h.hole_number, h]));
  const cells = Array.from({ length: totalHoles }, (_, i) => byNumber.get(i + 1));

  return (
    <View>
      <View className="flex-row flex-wrap gap-1">
        {cells.map((hole, i) => {
          if (!hole) {
            return (
              <View
                key={i}
                style={{
                  width: '10%',
                  aspectRatio: 1,
                  backgroundColor: colors.border.subtle,
                  opacity: 0.4,
                }}
                className="rounded justify-center items-center"
              >
                <Text className="text-text-muted text-[10px]">·</Text>
              </View>
            );
          }
          const { bg, fg } = COLOR_MAP[categoryFor(hole.score, hole.par)];
          return (
            <View
              key={hole.id}
              style={{ width: '10%', aspectRatio: 1, backgroundColor: bg }}
              className="rounded justify-center items-center"
            >
              <Text style={{ color: fg }} className="text-[10px] font-bold">
                {hole.score}
              </Text>
            </View>
          );
        })}
      </View>
      <View className="flex-row gap-3 mt-3">
        <View className="flex-row items-center gap-1">
          <View style={{ backgroundColor: colors.accent }} className="w-2 h-2 rounded-full" />
          <Text className="text-text-secondary text-[10px]">Birdie+</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View
            style={{ backgroundColor: colors.text.secondary }}
            className="w-2 h-2 rounded-full"
          />
          <Text className="text-text-secondary text-[10px]">Par</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View
            style={{ backgroundColor: colors.border.subtle }}
            className="w-2 h-2 rounded-full"
          />
          <Text className="text-text-secondary text-[10px]">Bogey+</Text>
        </View>
      </View>
    </View>
  );
}
