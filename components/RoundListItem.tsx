import { Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';

import { parseLocalDate } from '@/lib/date';

type Props = {
  round: {
    id: string;
    course_id: string;
    played_at: string;
    total_score: number;
    total_par: number;
    courses: { name: string; city: string | null; state: string | null } | null;
  };
  onPress: () => void;
};

export function RoundListItem({ round, onPress }: Props) {
  const diff = round.total_score - round.total_par;
  const diffStr = diff >= 0 ? `+${diff}` : String(diff);
  const date = format(parseLocalDate(round.played_at), 'MMM d, yyyy');
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3 border-b border-border-subtle active:opacity-60"
    >
      <View className="flex-1">
        <Text className="text-text-primary font-semibold text-sm">
          {round.courses?.name ?? 'Round'}
        </Text>
        <Text className="text-text-secondary text-xs">{date}</Text>
      </View>
      <View className="items-end">
        <Text className="text-text-primary font-semibold text-base">{round.total_score}</Text>
        <Text className="text-accent text-xs">{diffStr}</Text>
      </View>
    </Pressable>
  );
}
