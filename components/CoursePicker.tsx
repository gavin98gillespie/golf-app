import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { CourseListItem } from '@/components/CourseListItem';
import { useRecentCourses, useCourseSearch, useNearbyCourses } from '@/lib/queries/courses';
import { useSession } from '@/lib/hooks/useSession';
import { useMyProfile, useHomeCourse } from '@/lib/queries/profile';
import { palette, fontFamily } from '@/theme/linksman';

type Props = {
  headline: string;
  /** Returns true if the picker should keep the screen mounted after pick (caller handled navigation). */
  onPick: (courseId: string) => boolean | void | Promise<boolean | void>;
  /** Hide the home course row at top (e.g. when picking the home course itself). */
  hideHomeCourseRow?: boolean;
  /** Called when the user dismisses without picking. Default: router.back(). */
  onCancel?: () => void;
};

export function CoursePicker({ headline, onPick, hideHomeCourseRow, onCancel }: Props) {
  const [query, setQuery] = useState('');
  const { session } = useSession();
  const recent = useRecentCourses(session?.user.id, 5);
  const search = useCourseSearch(query);
  const nearbyQ = useNearbyCourses(25);
  const profileQ = useMyProfile(session?.user.id);
  const homeCourseQ = useHomeCourse(profileQ.data?.home_course_id);

  const isSearching = query.length >= 2;
  const handlePick = async (courseId: string) => {
    const keepOpen = await onPick(courseId);
    if (keepOpen === true) return;
    if (onCancel) onCancel();
    else router.back();
  };

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
        <Pressable onPress={onCancel ?? (() => router.back())} hitSlop={8}>
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              letterSpacing: 11 * 0.16,
              color: palette.bone,
              opacity: 0.7,
              textTransform: 'uppercase',
            }}
          >
            ‹ CANCEL
          </Text>
        </Pressable>
      </View>
      <Text
        style={{
          fontFamily: fontFamily.display,
          fontSize: 32,
          letterSpacing: -32 * 0.02,
          color: palette.bone,
          marginTop: 8,
          lineHeight: 32 * 1.05,
        }}
      >
        {headline}
      </Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by course name…"
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

      {!isSearching && !hideHomeCourseRow && homeCourseQ.data ? (
        <>
          {eyebrow('HOME COURSE')}
          <CourseListItem
            course={homeCourseQ.data}
            onPress={() => handlePick(homeCourseQ.data!.id)}
          />
        </>
      ) : null}

      {!isSearching && (recent.data?.length ?? 0) > 0 ? (
        <>
          {eyebrow('RECENT')}
          {recent.data!.map((course) => (
            <CourseListItem key={course.id} course={course} onPress={() => handlePick(course.id)} />
          ))}
        </>
      ) : null}

      {!isSearching ? (
        <>
          {eyebrow('NEAR ME')}
          {nearbyQ.isLoading ? (
            <ActivityIndicator />
          ) : (nearbyQ.data ?? []).length === 0 ? (
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 12,
                color: palette.bone,
                opacity: 0.55,
                marginTop: 4,
              }}
            >
              {nearbyQ.error ? 'Location unavailable.' : 'No courses found within 25 mi.'}
            </Text>
          ) : (
            (nearbyQ.data ?? []).map((c) => (
              <CourseListItem key={c.id} course={c} onPress={() => handlePick(c.id)} />
            ))
          )}
        </>
      ) : (
        <>
          {eyebrow('SEARCH RESULTS')}
          <FlatList
            data={search.data ?? []}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <CourseListItem course={item} onPress={() => handlePick(item.id)} />
            )}
            ListEmptyComponent={
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 12,
                  color: palette.bone,
                  opacity: 0.55,
                  marginTop: 4,
                }}
              >
                No courses match. Add it as a new course below.
              </Text>
            }
          />
        </>
      )}

      <Pressable
        onPress={() => router.push('/round/new/add-course')}
        style={{
          paddingVertical: 14,
          marginTop: 16,
          borderWidth: 0.5,
          borderStyle: 'dashed',
          borderColor: palette.bone + '40',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 12,
            letterSpacing: 12 * 0.16,
            color: palette.fairway,
            textTransform: 'uppercase',
          }}
        >
          + ADD A NEW COURSE
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}
