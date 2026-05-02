import { useState } from 'react';
import { FlatList, Text, TextInput, View, ActivityIndicator } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { UserListItem } from '@/components/UserListItem';
import { CourseListItem } from '@/components/CourseListItem';
import { useSearchUsers } from '@/lib/queries/users';
import { useCourseSearch } from '@/lib/queries/courses';
import { useSession } from '@/lib/hooks/useSession';

export default function Discover() {
  const { session } = useSession();
  const viewerId = session?.user.id;
  const [q, setQ] = useState('');

  const usersQ = useSearchUsers(q, viewerId);
  const coursesQ = useCourseSearch(q);

  const showResults = q.trim().length >= 2;

  return (
    <ScreenContainer>
      <Text className="text-text-primary text-3xl font-light mt-12">Discover</Text>

      <View className="mt-4">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search players or courses"
          placeholderTextColor="#4a5a52"
          autoCapitalize="none"
          autoCorrect={false}
          className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-primary"
        />
      </View>

      {!showResults ? (
        <Text className="text-text-secondary text-sm mt-6">
          Type at least 2 characters to search.
        </Text>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => 'unused'}
          ListHeaderComponent={
            <View>
              <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-6 mb-2">
                Players
              </Text>
              {usersQ.isLoading ? (
                <ActivityIndicator className="my-4" />
              ) : (usersQ.data ?? []).length === 0 ? (
                <Text className="text-text-secondary text-sm py-2">No players found.</Text>
              ) : (
                (usersQ.data ?? []).map((u) =>
                  viewerId ? <UserListItem key={u.id} user={u} viewerId={viewerId} /> : null,
                )
              )}

              <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-6 mb-2">
                Courses
              </Text>
              {coursesQ.isLoading ? (
                <ActivityIndicator className="my-4" />
              ) : (coursesQ.data ?? []).length === 0 ? (
                <Text className="text-text-secondary text-sm py-2">No courses found.</Text>
              ) : (
                (coursesQ.data ?? []).map((c) => (
                  <CourseListItem key={c.id} course={c} onPress={() => undefined} />
                ))
              )}
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}
