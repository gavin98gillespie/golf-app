import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { CourseListItem } from '@/components/CourseListItem';
import { UserListItem } from '@/components/UserListItem';
import { useCourseSearch, useRecentCourses } from '@/lib/queries/courses';
import { useSearchUsers } from '@/lib/queries/users';
import { useSession } from '@/lib/hooks/useSession';
import { useFollowingList } from '@/lib/queries/follows';
import { palette, fontFamily } from '@/theme/linksman';

const JOIN_CODE_RE = /^[A-Z0-9]{6}$/i;

export default function Search() {
  const { session } = useSession();
  const viewerId = session?.user.id;
  const [q, setQ] = useState('');
  const trimmed = q.trim();
  const isJoinCode = JOIN_CODE_RE.test(trimmed);
  const showResults = trimmed.length >= 2;

  const usersQ = useSearchUsers(trimmed, viewerId);
  const coursesQ = useCourseSearch(trimmed);
  const recentCoursesQ = useRecentCourses(viewerId, 5);
  const followingQ = useFollowingList(viewerId);

  const followingPreview = (followingQ.data ?? []).slice(0, 5);

  const eyebrow = (label: string) => (
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
      {label}
    </Text>
  );

  return (
    <ScreenContainer>
      <View
        style={{
          paddingTop: 8,
          paddingBottom: 14,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
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
          SEARCH
        </Text>
      </View>

      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search players, courses, or join code"
        placeholderTextColor={palette.bone + '55'}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          fontFamily: fontFamily.editorial ?? fontFamily.display,
          fontSize: 18,
          color: palette.bone,
          paddingVertical: 12,
          marginTop: 16,
          borderBottomWidth: 0.5,
          borderBottomColor: palette.bone + '33',
        }}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isJoinCode ? (
          <Pressable
            onPress={() => router.push('/(app)/join-round')}
            style={{
              paddingVertical: 16,
              marginTop: 16,
              borderTopWidth: 0.5,
              borderBottomWidth: 0.5,
              borderColor: palette.bone + '33',
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 9,
                letterSpacing: 9 * 0.2,
                color: palette.brass,
                textTransform: 'uppercase',
              }}
            >
              JOIN ROUND
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.display,
                fontSize: 22,
                color: palette.bone,
                marginTop: 4,
              }}
            >
              Use code {trimmed.toUpperCase()} →
            </Text>
          </Pressable>
        ) : null}

        {showResults ? (
          <>
            {eyebrow('PLAYERS')}
            {viewerId && (usersQ.data ?? []).length > 0 ? (
              (usersQ.data ?? [])
                .slice(0, 8)
                .map((u) => <UserListItem key={u.id} user={u} viewerId={viewerId} />)
            ) : (
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 12,
                  color: palette.bone,
                  opacity: 0.55,
                }}
              >
                No matches.
              </Text>
            )}

            {eyebrow('COURSES')}
            {(coursesQ.data ?? []).length > 0 ? (
              (coursesQ.data ?? [])
                .slice(0, 8)
                .map((c) => (
                  <CourseListItem
                    key={c.id}
                    course={c}
                    onPress={() => router.push({ pathname: '/course/[id]', params: { id: c.id } })}
                  />
                ))
            ) : (
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 12,
                  color: palette.bone,
                  opacity: 0.55,
                }}
              >
                No matches.
              </Text>
            )}
          </>
        ) : (
          <>
            {(recentCoursesQ.data?.length ?? 0) > 0 ? (
              <>
                {eyebrow('RECENTLY PLAYED')}
                {recentCoursesQ.data!.map((c) => (
                  <CourseListItem
                    key={c.id}
                    course={c}
                    onPress={() => router.push({ pathname: '/course/[id]', params: { id: c.id } })}
                  />
                ))}
              </>
            ) : null}

            {viewerId && followingPreview.length > 0 ? (
              <>
                {eyebrow('PEOPLE YOU FOLLOW')}
                {followingPreview.map((u) => (
                  <UserListItem key={u.id} user={u} viewerId={viewerId} />
                ))}
              </>
            ) : null}

            {(recentCoursesQ.data?.length ?? 0) === 0 && followingPreview.length === 0 ? (
              <Text
                style={{
                  fontFamily: fontFamily.display,
                  fontSize: 22,
                  color: palette.bone,
                  opacity: 0.7,
                  marginTop: 32,
                }}
              >
                Find players or courses to begin.
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
