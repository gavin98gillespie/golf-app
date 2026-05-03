import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { palette, fontFamily } from '@/theme/linksman';
import type { Tables } from '@/lib/supabase';

type Props = {
  course: Pick<Tables<'courses'>, 'id' | 'name' | 'city' | 'state'> | null | undefined;
};

export function HomeCourseCard({ course }: Props) {
  return (
    <View style={{ paddingVertical: 24 }}>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 9 * 0.2,
          color: palette.ink,
          opacity: 0.55,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        HOME COURSE
      </Text>
      {course ? (
        <>
          <Pressable
            onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
          >
            <Text
              style={{
                fontFamily: fontFamily.display,
                fontSize: 32,
                letterSpacing: -32 * 0.02,
                color: palette.ink,
                lineHeight: 32 * 1.05,
              }}
              numberOfLines={2}
            >
              {course.name ?? '—'}
            </Text>
            {course.city || course.state ? (
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 11,
                  letterSpacing: 11 * 0.16,
                  color: palette.ink,
                  opacity: 0.55,
                  marginTop: 4,
                  textTransform: 'uppercase',
                }}
              >
                {[course.city, course.state].filter(Boolean).join(', ').toUpperCase()}
              </Text>
            ) : null}
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 16 }}>
            <Pressable
              onPress={() => router.push('/round/new/course')}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: palette.fairway,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 12,
                  letterSpacing: 12 * 0.16,
                  color: palette.bone,
                  textTransform: 'uppercase',
                }}
              >
                START A CARD →
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/round/new/course', params: { mode: 'homeCourse' } })
              }
              hitSlop={8}
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 11,
                  letterSpacing: 11 * 0.16,
                  color: palette.ink,
                  opacity: 0.55,
                  textTransform: 'uppercase',
                }}
              >
                CHANGE
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 32,
              letterSpacing: -32 * 0.02,
              color: palette.ink,
              lineHeight: 32 * 1.05,
            }}
          >
            Pick where you play most.
          </Text>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/round/new/course', params: { mode: 'homeCourse' } })
            }
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: palette.fairway,
              alignSelf: 'flex-start',
              marginTop: 16,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 12,
                letterSpacing: 12 * 0.16,
                color: palette.bone,
                textTransform: 'uppercase',
              }}
            >
              CHOOSE A COURSE →
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
