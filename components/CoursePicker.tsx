import { useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { SearchField } from '@/components/SearchField';
import { ScreenContainer } from '@/components/ScreenContainer';
import { CourseListItem } from '@/components/CourseListItem';
import { useRecentCourses, useCourseSearch, useNearbyCourses } from '@/lib/queries/courses';
import { useSession } from '@/lib/hooks/useSession';
import { useMyProfile, useHomeCourse } from '@/lib/queries/profile';
import { palette, fontFamily } from '@/theme/linksman';

type Props = {
  headline: string;
  footer?: ReactNode;
  /** Returns true if the picker should keep the screen mounted after pick (caller handled navigation). */
  onPick: (courseId: string) => boolean | void | Promise<boolean | void>;
  /** Hide the home course row at top (e.g. when picking the home course itself). */
  hideHomeCourseRow?: boolean;
  /** Hide the ‹ CANCEL header button (e.g. in onboarding where a footer Skip link handles dismissal). */
  hideCancel?: boolean;
  /** Called when the user dismisses without picking. Default: router.back(). */
  onCancel?: () => void;
};

export function CoursePicker({
  headline,
  onPick,
  hideHomeCourseRow,
  hideCancel,
  onCancel,
  footer,
}: Props) {
  const [query, setQuery] = useState('');
  const picking = useRef(false);
  const { session } = useSession();
  const recent = useRecentCourses(session?.user.id, 5);
  const search = useCourseSearch(query);
  const nearbyQ = useNearbyCourses(25);
  const profileQ = useMyProfile(session?.user.id);
  const homeCourseQ = useHomeCourse(profileQ.data?.home_course_id);

  const isSearching = query.length >= 2;
  const handlePick = async (courseId: string) => {
    if (picking.current) return;
    picking.current = true;
    Keyboard.dismiss();
    try {
      const keepOpen = await onPick(courseId);
      if (keepOpen === true) return;
      if (onCancel) onCancel();
      else router.back();
    } catch {
      Alert.alert('Course not saved', 'Please try selecting your course again.');
    } finally {
      picking.current = false;
    }
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {!hideCancel ? (
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
          ) : null}
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
          <SearchField
            accessibilityLabel="Search courses"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
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
                <CourseListItem
                  key={course.id}
                  course={course}
                  onPress={() => handlePick(course.id)}
                />
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
              {search.isFetching ? <ActivityIndicator color={palette.sage} /> : null}
              {(search.data ?? []).map((course) => (
                <CourseListItem
                  key={course.id}
                  course={course}
                  onPress={() => handlePick(course.id)}
                />
              ))}
              {!search.isFetching && (search.data ?? []).length === 0 ? (
                <Text style={{ color: palette.bone, fontSize: 16 }}>
                  {search.isError
                    ? 'Could not search courses. Please try again.'
                    : 'No courses match your search.'}
                </Text>
              ) : null}
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
        </ScrollView>
        {footer}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
