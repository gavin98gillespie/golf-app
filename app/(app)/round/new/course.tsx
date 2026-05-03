import { router, useLocalSearchParams } from 'expo-router';

import { CoursePicker } from '@/components/CoursePicker';
import { useUpdateHomeCourse } from '@/lib/queries/profile';
import { useSession } from '@/lib/hooks/useSession';

export default function CoursePickerScreen() {
  const { session } = useSession();
  const params = useLocalSearchParams<{ mode?: string }>();
  const updateHome = useUpdateHomeCourse();

  if (params.mode === 'homeCourse') {
    return (
      <CoursePicker
        headline="Pick your home course"
        hideHomeCourseRow
        onPick={async (courseId) => {
          if (!session?.user.id) return;
          await updateHome.mutateAsync({ userId: session.user.id, courseId });
        }}
      />
    );
  }

  if (params.mode === 'groupRoundSelect') {
    return (
      <CoursePicker
        headline="Pick a course for the group"
        onPick={(courseId) => {
          router.replace({ pathname: '/round/new/group-setup', params: { courseId } });
          return true;
        }}
      />
    );
  }

  return (
    <CoursePicker
      headline="Pick a course"
      onPick={(courseId) => {
        router.push({ pathname: '/round/new/setup', params: { courseId } });
        return true;
      }}
    />
  );
}
