import { useState } from 'react';
import { Text, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useCreateCourse } from '@/lib/queries/courses';

const Schema = z.object({
  name: z.string().min(1, 'Required').max(200),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  holeCount: z.union([z.literal(9), z.literal(18), z.literal(27), z.literal(36)]),
});

export default function AddCourse() {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [holeCount, setHoleCount] = useState<9 | 18 | 27 | 36>(18);
  const [error, setError] = useState<string | null>(null);
  const createCourse = useCreateCourse();

  async function onSubmit() {
    setError(null);
    const parsed = Schema.safeParse({
      name,
      city: city || undefined,
      state: state || undefined,
      holeCount,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    try {
      const course = await createCourse.mutateAsync({
        name: parsed.data.name,
        city: parsed.data.city ?? null,
        state: parsed.data.state ?? null,
        country: 'US',
        hole_count: parsed.data.holeCount,
      });
      router.replace({ pathname: '/round/new/setup', params: { courseId: course.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-text-primary text-3xl font-light tracking-tight mb-2">
            Add a new course
          </Text>
          <Text className="text-text-secondary text-sm mb-8">
            Add the course where you&apos;re playing. Other golfers will see it too.
          </Text>
          <Input label="Course name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Input
            label="City (optional)"
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
          />
          <Input
            label="State (optional)"
            value={state}
            onChangeText={setState}
            autoCapitalize="characters"
          />

          <Text className="text-text-secondary text-xs uppercase tracking-wider mb-2 mt-2">
            Hole count
          </Text>
          <View className="flex-row gap-2 mb-6">
            {[9, 18, 27, 36].map((n) => {
              const active = holeCount === n;
              return (
                <View
                  key={n}
                  onTouchEnd={() => setHoleCount(n as 9 | 18 | 27 | 36)}
                  className={`flex-1 py-3 rounded-xl border items-center ${
                    active ? 'border-accent bg-accent-soft' : 'border-border-subtle'
                  }`}
                >
                  <Text className={`font-semibold ${active ? 'text-accent' : 'text-text-primary'}`}>
                    {n}
                  </Text>
                </View>
              );
            })}
          </View>

          {error ? <Text className="text-red-500 text-sm mb-4">{error}</Text> : null}
          <Button
            label="Add course & continue"
            onPress={onSubmit}
            loading={createCourse.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
