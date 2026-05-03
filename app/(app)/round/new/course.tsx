import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { CourseListItem } from '@/components/CourseListItem';
import { useRecentCourses, useCourseSearch, useNearbyCourses } from '@/lib/queries/courses';
import { useSession } from '@/lib/hooks/useSession';
import { useUpdateHomeCourse } from '@/lib/queries/profile';

export default function CoursePicker() {
  const [query, setQuery] = useState('');

  const { session } = useSession();
  const recent = useRecentCourses(session?.user.id, 5);
  const search = useCourseSearch(query);
  const nearbyQ = useNearbyCourses(25);

  const params = useLocalSearchParams<{ mode?: string }>();
  const isHomeCourseMode = params.mode === 'homeCourse';
  const updateHomeCourse = useUpdateHomeCourse();

  const isSearching = query.length >= 2;
  const goToCourse = async (courseId: string) => {
    if (isHomeCourseMode) {
      if (!session?.user.id) return;
      await updateHomeCourse.mutateAsync({ userId: session.user.id, courseId });
      router.back();
      return;
    }
    router.push({ pathname: '/round/new/setup', params: { courseId } });
  };

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.replace('/(app)/(tabs)')} className="mt-4 mb-2">
        <Text className="text-text-secondary text-sm">← Cancel</Text>
      </Pressable>
      <Text className="text-text-primary text-3xl font-light mt-2 mb-4">
        {isHomeCourseMode ? 'Pick your home course' : 'Pick a course'}
      </Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by course name…"
        placeholderTextColor="#4a5a52"
        className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-primary"
        autoCapitalize="none"
      />

      {!isSearching && (recent.data?.length ?? 0) > 0 ? (
        <>
          <Text className="text-text-secondary text-xs uppercase tracking-wider mt-6 mb-2">
            Recent
          </Text>
          {recent.data!.map((course) => (
            <CourseListItem key={course.id} course={course} onPress={() => goToCourse(course.id)} />
          ))}
        </>
      ) : null}

      {!isSearching ? (
        <>
          <Text className="text-text-secondary text-xs uppercase tracking-wider mt-6 mb-2">
            Near me
          </Text>
          {nearbyQ.isLoading ? (
            <ActivityIndicator />
          ) : (nearbyQ.data ?? []).length === 0 ? (
            <Text className="text-text-secondary text-sm mt-2">
              {nearbyQ.error ? 'Location unavailable.' : 'No courses found within 25 mi.'}
            </Text>
          ) : (
            (nearbyQ.data ?? []).map((c) => (
              <CourseListItem key={c.id} course={c} onPress={() => goToCourse(c.id)} />
            ))
          )}
        </>
      ) : (
        <>
          <Text className="text-text-secondary text-xs uppercase tracking-wider mt-6 mb-2">
            Search results
          </Text>
          <FlatList
            data={search.data ?? []}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <CourseListItem course={item} onPress={() => goToCourse(item.id)} />
            )}
            ListEmptyComponent={
              <Text className="text-text-secondary text-sm mt-2">
                No courses match. Add it as a new course below.
              </Text>
            }
          />
        </>
      )}

      <Pressable
        onPress={() => router.push('/round/new/add-course')}
        className="py-3 border border-dashed border-border-subtle rounded-xl mb-4 mt-4 active:opacity-60"
      >
        <Text className="text-accent text-center font-semibold">+ Add a new course</Text>
      </Pressable>
    </ScreenContainer>
  );
}
