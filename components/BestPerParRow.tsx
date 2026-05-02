import { Text, View } from 'react-native';

type Props = {
  bestPerPar: Record<number, number | null>;
};

/**
 * Three side-by-side cells showing the user's best score on a Par 3/4/5.
 * Par 6 holes exist but are extremely rare — show only if the user actually
 * has data for one.
 */
export function BestPerParRow({ bestPerPar }: Props) {
  const cells: { par: number; label: string }[] = [
    { par: 3, label: 'Par 3' },
    { par: 4, label: 'Par 4' },
    { par: 5, label: 'Par 5' },
  ];
  if (bestPerPar[6] != null) cells.push({ par: 6, label: 'Par 6' });

  return (
    <View className="flex-row gap-3">
      {cells.map(({ par, label }) => {
        const best = bestPerPar[par];
        const diff = best == null ? null : best - par;
        let diffLabel = 'No data';
        if (diff != null) {
          if (diff < -2) diffLabel = `${diff}`;
          else if (diff === -2) diffLabel = 'Eagle';
          else if (diff === -1) diffLabel = 'Birdie';
          else if (diff === 0) diffLabel = 'Par';
          else if (diff === 1) diffLabel = 'Bogey';
          else diffLabel = `+${diff}`;
        }
        return (
          <View
            key={par}
            className="flex-1 bg-bg-surface border border-border-subtle rounded-2xl p-4"
          >
            <Text className="text-text-secondary text-[10px] uppercase tracking-wider">
              {label}
            </Text>
            <Text className="text-text-primary text-3xl font-light mt-2">{best ?? '—'}</Text>
            <Text className="text-text-secondary text-[10px] mt-1">{diffLabel}</Text>
          </View>
        );
      })}
    </View>
  );
}
