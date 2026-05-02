import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';

import { ScreenContainer } from '@/components/ScreenContainer';
import { CourseListItem } from '@/components/CourseListItem';
import { useRecentCourses, useCourseSearch, useNearbyCourses } from '@/lib/queries/courses';
import { useSession } from '@/lib/hooks/useSession';

export default function CoursePicker() {
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  const { session } = useSession();
  const recent = useRecentCourses(session?.user.id, 5);
  const search = useCourseSearch(query);
  const nearby = useNearbyCourses(coords?.lat ?? null, coords?.lng ?? null);

  const list = query.length >= 2 ? search.data : nearby.data;
  const sectionLabel = query.length >= 2 ? 'Search results' : 'Near you';

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.replace('/(app)/(tabs)')} className="mt-4 mb-2">
        <Text className="text-text-secondary text-sm">← Cancel</Text>
      </Pressable>
      <Text className="text-text-primary text-3xl font-light mt-2 mb-4">Pick a course</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by course name…"
        placeholderTextColor="#4a5a52"
        className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-primary"
        autoCapitalize="none"
      />
      {query.length < 2 && (recent.data?.length ?? 0) > 0 ? (
        <>
          <Text className="text-text-secondary text-xs uppercase tracking-wider mt-6 mb-2">
            Recent
          </Text>
          {recent.data!.map((course) => (
            <CourseListItem
              key={course.id}
              course={course}
              onPress={() =>
                router.push({ pathname: '/round/new/setup', params: { courseId: course.id } })
              }
            />
          ))}
        </>
      ) : null}

      <Text className="text-text-secondary text-xs uppercase tracking-wider mt-6 mb-2">
        {sectionLabel}
      </Text>
      <FlatList
        data={list ?? []}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <CourseListItem
            course={item}
            onPress={() =>
              router.push({ pathname: '/round/new/setup', params: { courseId: item.id } })
            }
          />
        )}
        ListEmptyComponent={
          <Text className="text-text-secondary text-sm mt-2">
            {query.length >= 2
              ? 'No courses match. Add it as a new course below.'
              : coords
                ? 'No courses found nearby. Try searching, or add a new course.'
                : 'Enable location to see courses near you, or search by name.'}
          </Text>
        }
      />
      <Pressable
        onPress={() => router.push('/round/new/add-course')}
        className="py-3 border border-dashed border-border-subtle rounded-xl mb-4 active:opacity-60"
      >
        <Text className="text-accent text-center font-semibold">+ Add a new course</Text>
      </Pressable>
    </ScreenContainer>
  );
}
