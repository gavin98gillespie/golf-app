import { router } from 'expo-router';

import { CoursePicker } from '@/components/CoursePicker';
import { useUpdateHomeCourse } from '@/lib/queries/profile';
import { useSession } from '@/lib/hooks/useSession';
import { OnboardingFooter } from '@/components/OnboardingFooter';

export default function OnboardingHomeCourse() {
  const { session } = useSession();
  const updateHome = useUpdateHomeCourse();

  const advance = () => router.push('/(onboarding)/regulars');

  return (
    <CoursePicker
      headline="Where do you play most?"
      hideHomeCourseRow
      hideCancel
      footer={<OnboardingFooter onSkip={advance} surface="ink" disabled={updateHome.isPending} />}
      onPick={async (courseId) => {
        if (!session?.user.id) return true;
        await updateHome.mutateAsync({ userId: session.user.id, courseId });
        advance();
        return true;
      }}
    />
  );
}
