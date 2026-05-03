import { useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, View } from 'react-native';

import { CourseListItem } from '@/components/CourseListItem';
import { ScreenContainer } from '@/components/ScreenContainer';
import { UserListItem } from '@/components/UserListItem';
import { Wordmark } from '@/components/Wordmark';
import { useSession } from '@/lib/hooks/useSession';
import { useCourseSearch } from '@/lib/queries/courses';
import { useSearchUsers } from '@/lib/queries/users';
import { fontFamily, palette } from '@/theme/linksman';

export default function Discover() {
  const { session } = useSession();
  const viewerId = session?.user.id;
  const [q, setQ] = useState('');

  const usersQ = useSearchUsers(q, viewerId);
  const coursesQ = useCourseSearch(q);

  const showResults = q.trim().length >= 2;

  return (
    <ScreenContainer>
      <View
        style={{
          paddingTop: 8,
          paddingBottom: 14,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottomWidth: 0.5,
          borderBottomColor: palette.bone + '14',
        }}
      >
        <Wordmark size={20} color={palette.bone} />
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 11,
            letterSpacing: 11 * 0.16,
            color: palette.bone,
            opacity: 0.6,
            textTransform: 'uppercase',
          }}
        >
          DISCOVER
        </Text>
      </View>

      <View
        style={{
          paddingTop: 24,
          paddingBottom: 16,
          borderBottomWidth: 0.5,
          borderBottomColor: palette.bone + '20',
        }}
      >
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.18,
            color: palette.bone,
            opacity: 0.55,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          SEARCH
        </Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Players or courses"
          placeholderTextColor={palette.bone + '55'}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            fontFamily: fontFamily.editorial,
            fontSize: 18,
            color: palette.bone,
            paddingVertical: 4,
          }}
        />
      </View>

      {!showResults ? (
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 11,
            color: palette.bone,
            opacity: 0.55,
            marginTop: 24,
          }}
        >
          Type at least 2 characters to search.
        </Text>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => 'unused'}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListHeaderComponent={
            <View>
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 9,
                  letterSpacing: 9 * 0.2,
                  color: palette.bone,
                  opacity: 0.55,
                  textTransform: 'uppercase',
                  marginTop: 24,
                  marginBottom: 8,
                }}
              >
                Players
              </Text>
              {usersQ.isLoading ? (
                <ActivityIndicator color={palette.bone} style={{ marginVertical: 12 }} />
              ) : (usersQ.data ?? []).length === 0 ? (
                <Text
                  style={{
                    fontFamily: fontFamily.mono,
                    fontSize: 11,
                    color: palette.bone,
                    opacity: 0.55,
                    paddingVertical: 8,
                  }}
                >
                  No players found.
                </Text>
              ) : (
                (usersQ.data ?? []).map((u) =>
                  viewerId ? <UserListItem key={u.id} user={u} viewerId={viewerId} /> : null,
                )
              )}

              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 9,
                  letterSpacing: 9 * 0.2,
                  color: palette.bone,
                  opacity: 0.55,
                  textTransform: 'uppercase',
                  marginTop: 24,
                  marginBottom: 8,
                }}
              >
                Courses
              </Text>
              {coursesQ.isLoading ? (
                <ActivityIndicator color={palette.bone} style={{ marginVertical: 12 }} />
              ) : (coursesQ.data ?? []).length === 0 ? (
                <Text
                  style={{
                    fontFamily: fontFamily.mono,
                    fontSize: 11,
                    color: palette.bone,
                    opacity: 0.55,
                    paddingVertical: 8,
                  }}
                >
                  No courses found.
                </Text>
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
