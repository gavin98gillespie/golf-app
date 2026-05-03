import { Pressable, Text, View } from 'react-native';

import type { Tables } from '@/lib/supabase';

type Props = {
  course: Tables<'courses'>;
  onPress: () => void;
};

export function CourseListItem({ course, onPress }: Props) {
  const subtitle = [course.city, course.state].filter(Boolean).join(', ');
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 py-3 border-b border-border-subtle active:opacity-60"
    >
      <View className="w-10 h-10 rounded-lg bg-bg-elevated items-center justify-center">
        <Text className="text-text-secondary text-base">◆</Text>
      </View>
      <View className="flex-1">
        <Text className="text-text-primary font-semibold text-sm">{course.name}</Text>
        <Text className="text-text-secondary text-xs">
          {subtitle || '—'} · {course.hole_count} holes
        </Text>
      </View>
    </Pressable>
  );
}
