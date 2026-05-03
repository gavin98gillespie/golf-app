# Phase 8 — Presence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Linksman openable on day one with a meaningful surface even when no mutuals have posted. Adds first-run onboarding, Today as default landing, restructured bottom nav (`Today | Feed | [Play] | Search | Me`), and editorial layered vocabulary (Round / Card / Ledger).

**Architecture:** Extends existing Supabase + TanStack Query + expo-router stack. One DB migration adds `onboarding_completed` flag with backfill so existing users skip the new flow. Onboarding lives in a separate `(onboarding)` route group with its own layout. Today, Feed, and Search become sibling tab routes; Settings moves out of `(tabs)` into a Profile-anchored route. A shared `<CoursePicker>` component is extracted and reused across round-setup, onboarding, settings, and Today.

**Tech Stack:** Expo SDK 54, expo-router, Supabase (Postgres + RLS), TanStack Query v5, NativeWind 4, Linksman theme (`palette` + `fontFamily` from `theme/linksman.ts`).

**Spec:** [docs/superpowers/specs/2026-05-03-phase-8-presence-design.md](../specs/2026-05-03-phase-8-presence-design.md)

**Conventions:**
- Work directly on `main`. No worktrees. Commit at the end of each task.
- `npm install --legacy-peer-deps` for any new dep (none planned this phase).
- Generated `lib/database.types.ts` is gitignored from ESLint; regenerate with `npm run db:types` after migrations.
- No automated test framework in this repo. "Verify" steps are typecheck (`npx tsc --noEmit`) + lint (`npx eslint <files>`) + manual smoke on phone via Expo Go where UI changes.
- One subagent per task. After all 13 tasks ship, full phone test → `git tag phase-8 && git push origin phase-8`.

---

## Task 1: DB migration — `onboarding_completed` flag

**Files:**
- Create: `supabase/migrations/20260512000001_phase8_profiles_onboarding_completed.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260512000001_phase8_profiles_onboarding_completed.sql
ALTER TABLE profiles
  ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Backfill: anyone with username + display_name has effectively finished
-- the equivalent of onboarding (Phase 1 profile-setup), so we don't force
-- them through the new Phase 8 flow.
UPDATE profiles
SET onboarding_completed = true
WHERE username IS NOT NULL AND display_name IS NOT NULL;
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase db push`
Expected: `Applying migration 20260512000001_phase8_profiles_onboarding_completed.sql... Finished supabase db push.`

- [ ] **Step 3: Regenerate types**

Run: `npm run db:types`
Expected: `lib/database.types.ts` updates to include `onboarding_completed` on the `profiles` table row/insert/update types.

- [ ] **Step 4: Verify backfill**

Run via Supabase SQL editor or CLI:
```sql
SELECT count(*) FILTER (WHERE onboarding_completed) AS done,
       count(*) FILTER (WHERE NOT onboarding_completed) AS pending
FROM profiles;
```
Expected: `done` equals total profile count; `pending` is 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260512000001_phase8_profiles_onboarding_completed.sql lib/database.types.ts
git commit -m "Phase 8: profiles.onboarding_completed flag with backfill"
```

---

## Task 2: `useCompleteOnboarding` mutation

**Files:**
- Modify: `lib/queries/profile.ts`

- [ ] **Step 1: Add mutation at the bottom of the file**

```ts
// lib/queries/profile.ts (append)
export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: (_d, userId) => {
      void qc.invalidateQueries({ queryKey: ['profile', userId] });
      void qc.invalidateQueries({ queryKey: ['myProfile'] });
    },
  });
}
```

- [ ] **Step 2: Verify `useMyProfile` returns the new column**

Confirm `useMyProfile` selects `*` (it should already; the regenerated types now include the flag). If it uses an explicit column list, add `onboarding_completed` to it.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add lib/queries/profile.ts
git commit -m "Phase 8: useCompleteOnboarding mutation"
```

---

## Task 3: Route guard — redirect to onboarding when incomplete

**Files:**
- Modify: `app/(app)/_layout.tsx`

- [ ] **Step 1: Update the redirect logic**

Replace the existing `useEffect` body in `app/(app)/_layout.tsx`:

```tsx
useEffect(() => {
  if (sessionLoading) return;
  if (!session) {
    router.replace('/(auth)/welcome');
    return;
  }
  if (profileQ.isLoading) return;
  if (!profileQ.data) {
    router.replace('/(auth)/profile-setup');
    return;
  }
  if (!profileQ.data.onboarding_completed) {
    router.replace('/(onboarding)/home-course');
  }
}, [session, sessionLoading, profileQ.isLoading, profileQ.data]);
```

The change: a third condition — once a profile exists, if `onboarding_completed` is false, redirect into the onboarding flow.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx eslint "app/(app)/_layout.tsx"`
Expected: clean.

The onboarding route does not exist yet (Task 4). For now the redirect target will 404 if a fresh user hits it. That's expected — Task 4 fixes it. Do not test on phone yet.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/_layout.tsx"
git commit -m "Phase 8: route guard redirects to onboarding when incomplete"
```

---

## Task 4: Onboarding route group + shared footer

**Files:**
- Create: `app/(onboarding)/_layout.tsx`
- Create: `components/OnboardingFooter.tsx`

- [ ] **Step 1: Onboarding layout**

```tsx
// app/(onboarding)/_layout.tsx
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Shared footer with skip link**

```tsx
// components/OnboardingFooter.tsx
import { Pressable, Text, View } from 'react-native';

import { palette, fontFamily } from '@/theme/linksman';

type Props = {
  onSkip?: () => void;
  skipLabel?: string;
};

export function OnboardingFooter({ onSkip, skipLabel = 'Skip for now' }: Props) {
  if (!onSkip) return null;
  return (
    <View style={{ alignItems: 'center', paddingVertical: 16 }}>
      <Pressable onPress={onSkip} hitSlop={12} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 11,
            letterSpacing: 11 * 0.18,
            color: palette.ink,
            opacity: 0.55,
            textTransform: 'uppercase',
          }}
        >
          {skipLabel}
        </Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npx eslint "app/(onboarding)/_layout.tsx" components/OnboardingFooter.tsx`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(onboarding)/_layout.tsx" components/OnboardingFooter.tsx
git commit -m "Phase 8: onboarding route group + shared footer"
```

---

## Task 5: Extract `<CoursePicker>` shared component

**Files:**
- Create: `components/CoursePicker.tsx`
- Modify: `app/(app)/round/new/course.tsx` (becomes thin wrapper)

The current `app/(app)/round/new/course.tsx` is a 125-line screen that branches on `params.mode` to behave differently in three contexts. We extract its body into a reusable component and let each calling context configure it via props.

- [ ] **Step 1: Create the shared component**

```tsx
// components/CoursePicker.tsx
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
  /** Returns true if the picker should pop the screen after pick (default true). */
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
```

- [ ] **Step 2: Refactor round-setup screen to use it**

Replace the entire body of `app/(app)/round/new/course.tsx` with a thin wrapper:

```tsx
// app/(app)/round/new/course.tsx
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
          return true; // we routed away ourselves
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
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npx eslint components/CoursePicker.tsx "app/(app)/round/new/course.tsx"`
Expected: clean.

Smoke test on phone: open Expo Go, sign in, tap brass Play → Solo round → course picker. Confirm the picker still searches, shows recent/nearby, and routes to setup. Repeat for Group round → "Pick a course for the group". Confirm Settings → "Home course" still works.

- [ ] **Step 4: Commit**

```bash
git add components/CoursePicker.tsx "app/(app)/round/new/course.tsx"
git commit -m "Phase 8: extract shared CoursePicker; round-setup becomes thin wrapper"
```

---

## Task 6: Onboarding Step 1 — Home Course

**Files:**
- Create: `app/(onboarding)/home-course.tsx`

- [ ] **Step 1: Write the screen**

```tsx
// app/(onboarding)/home-course.tsx
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
    <>
      <CoursePicker
        headline="Where do you play most?"
        hideHomeCourseRow
        onPick={async (courseId) => {
          if (!session?.user.id) return true;
          await updateHome.mutateAsync({ userId: session.user.id, courseId });
          advance();
          return true;
        }}
        onCancel={advance}
      />
      <OnboardingFooter onSkip={advance} />
    </>
  );
}
```

Note: `CoursePicker`'s back button doubles as "Cancel" — we override `onCancel` to advance instead, so the user can either pick a course (saves + advances) or skip (advances without saving). The footer also shows a "Skip for now" link below the picker.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx eslint "app/(onboarding)/home-course.tsx"`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "app/(onboarding)/home-course.tsx"
git commit -m "Phase 8: onboarding step 1 — Home Course"
```

---

## Task 7: Onboarding Step 2 — Your Regulars

**Files:**
- Create: `app/(onboarding)/regulars.tsx`

- [ ] **Step 1: Write the screen**

```tsx
// app/(onboarding)/regulars.tsx
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { UserListItem } from '@/components/UserListItem';
import { OnboardingFooter } from '@/components/OnboardingFooter';
import { useSearchUsers } from '@/lib/queries/users';
import { useSession } from '@/lib/hooks/useSession';
import { palette, fontFamily } from '@/theme/linksman';

export default function OnboardingRegulars() {
  const { session } = useSession();
  const [q, setQ] = useState('');
  const usersQ = useSearchUsers(q, session?.user.id);
  const advance = () => router.push('/(onboarding)/begin');

  return (
    <ScreenContainer surface="bone">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.2,
            color: palette.ink,
            opacity: 0.55,
            textTransform: 'uppercase',
            marginTop: 16,
          }}
        >
          YOUR REGULARS
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 32,
            letterSpacing: -32 * 0.02,
            color: palette.ink,
            marginTop: 4,
            lineHeight: 32 * 1.05,
          }}
        >
          Who do you play with?
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 12,
            color: palette.ink,
            opacity: 0.6,
            marginTop: 8,
            lineHeight: 18,
          }}
        >
          Linksman is mutual-only. Follow people you actually play with — you'll see their rounds when they follow you back.
        </Text>

        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by username or name"
          placeholderTextColor={palette.ink + '55'}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            fontFamily: fontFamily.editorial ?? fontFamily.display,
            fontSize: 18,
            color: palette.ink,
            paddingVertical: 12,
            marginTop: 24,
            borderBottomWidth: 0.5,
            borderBottomColor: palette.ink + '33',
          }}
        />

        <View style={{ marginTop: 16 }}>
          {(usersQ.data ?? []).map((u) => (
            <UserListItem key={u.id} user={u} viewerId={session?.user.id} />
          ))}
          {q.trim().length >= 2 && (usersQ.data ?? []).length === 0 ? (
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 12,
                color: palette.ink,
                opacity: 0.55,
                marginTop: 8,
              }}
            >
              No matches.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <Pressable
        onPress={advance}
        style={{
          marginBottom: 16,
          paddingVertical: 16,
          backgroundColor: palette.fairway,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 13,
            letterSpacing: 13 * 0.18,
            color: palette.bone,
            textTransform: 'uppercase',
          }}
        >
          CONTINUE →
        </Text>
      </Pressable>
      <OnboardingFooter onSkip={advance} />
    </ScreenContainer>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx eslint "app/(onboarding)/regulars.tsx"`
Expected: clean. If `UserListItem` requires different props than shown, adapt the call site to match the existing component signature (do not modify the component for this task).

- [ ] **Step 3: Commit**

```bash
git add "app/(onboarding)/regulars.tsx"
git commit -m "Phase 8: onboarding step 2 — Your Regulars"
```

---

## Task 8: Onboarding Step 3 — Begin

**Files:**
- Create: `app/(onboarding)/begin.tsx`

- [ ] **Step 1: Write the screen**

```tsx
// app/(onboarding)/begin.tsx
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { useCompleteOnboarding, useMyProfile, useHomeCourse } from '@/lib/queries/profile';
import { useSession } from '@/lib/hooks/useSession';
import { palette, fontFamily } from '@/theme/linksman';

export default function OnboardingBegin() {
  const { session } = useSession();
  const profileQ = useMyProfile(session?.user.id);
  const homeCourseQ = useHomeCourse(profileQ.data?.home_course_id);
  const complete = useCompleteOnboarding();

  const courseName = homeCourseQ.data?.name ?? 'Linksman';

  const finish = async (target: 'card' | 'today') => {
    if (!session?.user.id) return;
    await complete.mutateAsync(session.user.id);
    if (target === 'card') {
      if (homeCourseQ.data?.id) {
        router.replace({
          pathname: '/round/new/setup',
          params: { courseId: homeCourseQ.data.id },
        });
      } else {
        router.replace('/round/new/course');
      }
    } else {
      router.replace('/(app)/(tabs)');
    }
  };

  const datum = (label: string, value: string) => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingVertical: 16,
        borderTopWidth: 0.5,
        borderColor: palette.ink + '22',
      }}
    >
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 9 * 0.2,
          color: palette.ink,
          opacity: 0.55,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 12,
          color: palette.ink,
          opacity: 0.55,
        }}
      >
        {value}
      </Text>
    </View>
  );

  return (
    <ScreenContainer surface="bone">
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View>
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 9,
              letterSpacing: 9 * 0.2,
              color: palette.ink,
              opacity: 0.55,
              textTransform: 'uppercase',
              marginTop: 24,
            }}
          >
            YOUR LEDGER
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 36,
              letterSpacing: -36 * 0.02,
              color: palette.ink,
              marginTop: 4,
              lineHeight: 36 * 1.05,
            }}
            numberOfLines={2}
          >
            {courseName}
          </Text>

          <View style={{ marginTop: 24 }}>
            {datum('BEST CARD', 'No card yet')}
            {datum('LAST CARD', 'No card yet')}
            {datum('NOTES', 'No notes yet')}
          </View>
        </View>

        <View style={{ paddingBottom: 24 }}>
          <Pressable
            onPress={() => finish('card')}
            disabled={complete.isPending}
            style={{
              paddingVertical: 16,
              backgroundColor: palette.brass,
              alignItems: 'center',
              opacity: complete.isPending ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 13,
                letterSpacing: 13 * 0.18,
                color: palette.ink,
                textTransform: 'uppercase',
              }}
            >
              START A CARD →
            </Text>
          </Pressable>
          <Pressable
            onPress={() => finish('today')}
            disabled={complete.isPending}
            style={{ paddingVertical: 16, alignItems: 'center', marginTop: 4 }}
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 12,
                letterSpacing: 12 * 0.16,
                color: palette.ink,
                opacity: 0.6,
                textTransform: 'uppercase',
              }}
            >
              GO TO TODAY
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx eslint "app/(onboarding)/begin.tsx"`
Expected: clean.

Smoke test on phone (use a fresh Supabase auth user): create new account → profile-setup → onboarding flows through home-course → regulars → begin → Start a card lands in round-setup with home course pre-filled. Verify the second run of the app skips onboarding (flag now true).

- [ ] **Step 3: Commit**

```bash
git add "app/(onboarding)/begin.tsx"
git commit -m "Phase 8: onboarding step 3 — Begin (flips onboarding_completed)"
```

---

## Task 9: Tab restructure — Today/Feed/Search/Me, drop Discover/Settings

**Files:**
- Modify: `app/(app)/(tabs)/_layout.tsx`
- Modify: `components/TabBar.tsx`
- Move: `app/(app)/(tabs)/index.tsx` → `app/(app)/(tabs)/feed.tsx`
- Create: `app/(app)/(tabs)/index.tsx` (placeholder Today)
- Create: `app/(app)/(tabs)/search.tsx` (placeholder)

Settings is moved in Task 10, so for now leave the Settings file in place — just stop registering it in the tabs layout. The route is still reachable via `/settings` because expo-router auto-discovers it; we'll move the file in Task 10.

- [ ] **Step 1: Move existing Feed file to `feed.tsx`**

```bash
git mv "app/(app)/(tabs)/index.tsx" "app/(app)/(tabs)/feed.tsx"
```

The screen body does not need changes. It continues to render the mutuals feed (with draft-resume banner, WeeklySummary, etc.).

- [ ] **Step 2: Create placeholder Today at `index.tsx`**

This is a placeholder that the next task replaces. It exists so the tab route resolves cleanly during Task 9.

```tsx
// app/(app)/(tabs)/index.tsx
import { Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { palette, fontFamily } from '@/theme/linksman';

export default function Today() {
  return (
    <ScreenContainer surface="bone">
      <View style={{ marginTop: 24 }}>
        <Text
          style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.ink, opacity: 0.55 }}
        >
          TODAY
        </Text>
        <Text
          style={{ fontFamily: fontFamily.display, fontSize: 32, color: palette.ink, marginTop: 4 }}
        >
          Coming next.
        </Text>
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 3: Create placeholder Search**

```tsx
// app/(app)/(tabs)/search.tsx
import { Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { palette, fontFamily } from '@/theme/linksman';

export default function Search() {
  return (
    <ScreenContainer>
      <View style={{ marginTop: 24 }}>
        <Text
          style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.bone, opacity: 0.55 }}
        >
          SEARCH
        </Text>
        <Text
          style={{ fontFamily: fontFamily.display, fontSize: 32, color: palette.bone, marginTop: 4 }}
        >
          Coming next.
        </Text>
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 4: Update tabs layout**

```tsx
// app/(app)/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => {
        const route = props.state.routes[props.state.index];
        const name = route?.name as
          | 'index'
          | 'feed'
          | 'search'
          | 'profile'
          | 'start'
          | 'settings'
          | 'discover'
          | undefined;
        return <TabBar active={name ?? 'index'} />;
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="start" options={{ href: null }} />
      <Tabs.Screen name="discover" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
```

The `href: null` on `discover` and `settings` keeps the route resolvable (so existing `router.push('/discover')` calls don't 404) but hides them from the tab bar. Discover is fully removed in Task 12; Settings is moved out of tabs in Task 10.

- [ ] **Step 5: Update `TabBar` items**

Replace the `ITEMS` constant + `TabName` type and route mapping:

```tsx
// components/TabBar.tsx — top of file
type TabName = 'index' | 'feed' | 'search' | 'profile';

type TabItem = {
  name: TabName;
  label: string;
};

const ITEMS: TabItem[] = [
  { name: 'index', label: 'Today' },
  { name: 'feed', label: 'Feed' },
  { name: 'profile', label: 'Me' },
  { name: 'search', label: 'Search' },
];
```

Then update the `Props` type and any other reference to the union (the file is 124 lines; search for `discover` and `settings` and remove them from any rendering or routing logic). The brass Play button stays in the centerpiece slot — its position relative to the four items is unchanged.

If the TabBar's render order assumes 4 surrounding items with the play button center, the new order — Today, Feed, [Play], Me, Search — must be reflected. Adjust the `ITEMS.map(...)` rendering to insert the play button between index 1 (Feed) and index 2 (Me). If the existing component already does this with a fixed 4-item assumption, it should keep working with the relabeled items.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npx eslint "app/(app)/(tabs)/_layout.tsx" "app/(app)/(tabs)/feed.tsx" "app/(app)/(tabs)/index.tsx" "app/(app)/(tabs)/search.tsx" components/TabBar.tsx`
Expected: clean.

Smoke test on phone: launch app, confirm landing on Today placeholder. Tap Feed — see the existing mutuals feed. Tap Search — see the search placeholder. Tap Me — see Profile. Tap brass Play — see PlayModeSheet.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/(tabs)/_layout.tsx" "app/(app)/(tabs)/feed.tsx" "app/(app)/(tabs)/index.tsx" "app/(app)/(tabs)/search.tsx" components/TabBar.tsx
git commit -m "Phase 8: bottom-nav restructure — Today | Feed | [Play] | Search | Me"
```

---

## Task 10: Move Settings out of `(tabs)` + add SETTINGS link in Profile

**Files:**
- Move: `app/(app)/(tabs)/settings.tsx` → `app/(app)/settings.tsx`
- Modify: `app/(app)/(tabs)/_layout.tsx` (remove the `settings` Tabs.Screen entry)
- Modify: `app/(app)/(tabs)/profile.tsx` (add header link)

- [ ] **Step 1: Move the file**

```bash
git mv "app/(app)/(tabs)/settings.tsx" "app/(app)/settings.tsx"
```

The screen body doesn't need changes — its existing imports (ScreenContainer, etc.) work from any route depth.

- [ ] **Step 2: Drop Settings from the tabs layout**

In `app/(app)/(tabs)/_layout.tsx`, remove the `<Tabs.Screen name="settings" options={{ href: null }} />` line, and remove `'settings'` from the `name` union type.

- [ ] **Step 3: Add the SETTINGS link in Profile**

In `app/(app)/(tabs)/profile.tsx`, locate the existing top header row (Wordmark + any right-side content). Add a tappable mono row in the right slot:

```tsx
{/* in the header row's right slot */}
<Pressable
  onPress={() => router.push('/settings')}
  hitSlop={8}
  style={{ paddingVertical: 6, paddingHorizontal: 8 }}
>
  <Text
    style={{
      fontFamily: fontFamily.mono,
      fontSize: 11,
      letterSpacing: 11 * 0.18,
      color: palette.bone,
      opacity: 0.7,
      textTransform: 'uppercase',
    }}
  >
    SETTINGS →
  </Text>
</Pressable>
```

If the Profile header already has content on the right (e.g. a notification bell), keep both — SETTINGS goes to the rightmost slot. If the header doesn't exist as a flex row, wrap the existing top elements in:

```tsx
<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
  {/* existing left content (Wordmark/avatar) */}
  {/* new SETTINGS Pressable */}
</View>
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx eslint "app/(app)/settings.tsx" "app/(app)/(tabs)/_layout.tsx" "app/(app)/(tabs)/profile.tsx"`
Expected: clean.

Smoke test on phone: Profile → SETTINGS link → confirm Settings screen opens. Hardware back returns to Profile. Confirm Settings is not in the bottom tab bar.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/settings.tsx" "app/(app)/(tabs)/_layout.tsx" "app/(app)/(tabs)/profile.tsx"
git commit -m "Phase 8: move Settings out of bottom tabs into Profile header link"
```

---

## Task 11: Today screen — queries

**Files:**
- Create: `lib/queries/today.ts`

- [ ] **Step 1: Write three query hooks**

```ts
// lib/queries/today.ts
import { useQuery } from '@tanstack/react-query';

import { supabase, type Tables } from '@/lib/supabase';

export type TodayRoundSummary = {
  id: string;
  played_at: string;
  total_score: number;
  total_par: number;
  hole_count: number | null;
  course: { id: string; name: string | null } | null;
};

/**
 * Lowest-score round for the viewer at their home course.
 * Falls back to lowest-score round at any course if no home course set.
 */
export function useBestCard(userId: string | undefined, homeCourseId: string | null | undefined) {
  return useQuery({
    queryKey: ['today', 'bestCard', userId, homeCourseId ?? null],
    queryFn: async (): Promise<TodayRoundSummary | null> => {
      if (!userId) return null;
      let q = supabase
        .from('user_round_summaries')
        .select('round_id, played_at, total_score, total_par, hole_count, course_id')
        .eq('user_id', userId)
        .eq('player_status', 'finished')
        .eq('is_draft', false)
        .gt('total_score', 0)
        .order('total_score', { ascending: true })
        .limit(1);
      if (homeCourseId) q = q.eq('course_id', homeCourseId);
      const { data, error } = await q;
      if (error) throw error;
      const row = (data ?? [])[0];
      if (!row) return null;
      const courseRes = row.course_id
        ? await supabase.from('courses').select('id, name').eq('id', row.course_id).maybeSingle()
        : { data: null, error: null };
      if (courseRes.error) throw courseRes.error;
      return {
        id: row.round_id as string,
        played_at: row.played_at as string,
        total_score: row.total_score as number,
        total_par: row.total_par as number,
        hole_count: (row.hole_count as number | null) ?? null,
        course: courseRes.data
          ? { id: courseRes.data.id as string, name: courseRes.data.name as string | null }
          : null,
      };
    },
    enabled: !!userId,
  });
}

/** Most recent finished round for the viewer (any course). */
export function useLatestCard(userId: string | undefined) {
  return useQuery({
    queryKey: ['today', 'latestCard', userId],
    queryFn: async (): Promise<TodayRoundSummary | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('user_round_summaries')
        .select('round_id, played_at, total_score, total_par, hole_count, course_id')
        .eq('user_id', userId)
        .eq('player_status', 'finished')
        .eq('is_draft', false)
        .order('played_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = (data ?? [])[0];
      if (!row) return null;
      const courseRes = row.course_id
        ? await supabase.from('courses').select('id, name').eq('id', row.course_id).maybeSingle()
        : { data: null, error: null };
      if (courseRes.error) throw courseRes.error;
      return {
        id: row.round_id as string,
        played_at: row.played_at as string,
        total_score: row.total_score as number,
        total_par: row.total_par as number,
        hole_count: (row.hole_count as number | null) ?? null,
        course: courseRes.data
          ? { id: courseRes.data.id as string, name: courseRes.data.name as string | null }
          : null,
      };
    },
    enabled: !!userId,
  });
}

export type RegularsPulse = {
  round: Tables<'rounds'> & { courses: { name: string | null } | null };
  owner: { id: string; username: string | null; display_name: string | null } | null;
};

/**
 * Most recent round visible to the viewer from a mutual.
 * Reuses the same mutual filter as the feed.
 */
export function useLatestRegularsPulse(viewerId: string | undefined) {
  return useQuery({
    queryKey: ['today', 'regularsPulse', viewerId],
    queryFn: async (): Promise<RegularsPulse | null> => {
      if (!viewerId) return null;
      const followsRes = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', viewerId);
      if (followsRes.error) throw followsRes.error;
      const followingIds = (followsRes.data ?? []).map((r) => r.following_id);
      if (followingIds.length === 0) return null;

      const backRes = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', viewerId)
        .in('follower_id', followingIds);
      if (backRes.error) throw backRes.error;
      const mutualIds = (backRes.data ?? []).map((r) => r.follower_id);
      if (mutualIds.length === 0) return null;

      const rpRes = await supabase
        .from('round_players')
        .select('round_id')
        .in('user_id', mutualIds)
        .in('status', ['joined', 'finished']);
      if (rpRes.error) throw rpRes.error;
      const roundIds = Array.from(new Set((rpRes.data ?? []).map((r) => r.round_id)));
      if (roundIds.length === 0) return null;

      const { data, error } = await supabase
        .from('rounds')
        .select(
          `
          *,
          courses(name),
          profiles!rounds_user_id_fkey(id, username, display_name)
          `,
        )
        .in('id', roundIds)
        .in('visibility', ['mutuals', 'public'])
        .eq('is_draft', false)
        .order('played_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = (data ?? [])[0];
      if (!row) return null;
      type Row = Tables<'rounds'> & {
        courses: { name: string | null } | null;
        profiles: { id: string; username: string | null; display_name: string | null } | null;
      };
      const r = row as Row;
      return {
        round: { ...r, profiles: undefined } as RegularsPulse['round'],
        owner: r.profiles,
      };
    },
    enabled: !!viewerId,
  });
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx eslint lib/queries/today.ts`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add lib/queries/today.ts
git commit -m "Phase 8: today queries — useBestCard, useLatestCard, useLatestRegularsPulse"
```

---

## Task 12: Today screen — modules + composition

**Files:**
- Create: `components/HomeCourseCard.tsx`
- Create: `components/LedgerCard.tsx`
- Create: `components/RegularsPulseCard.tsx`
- Modify: `app/(app)/(tabs)/index.tsx` (replace placeholder with full Today)

- [ ] **Step 1: HomeCourseCard**

```tsx
// components/HomeCourseCard.tsx
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
          <Pressable onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}>
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
              onPress={() => router.push({ pathname: '/round/new/course', params: { mode: 'homeCourse' } })}
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
            onPress={() => router.push({ pathname: '/round/new/course', params: { mode: 'homeCourse' } })}
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
```

- [ ] **Step 2: LedgerCard**

```tsx
// components/LedgerCard.tsx
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';

import { palette, fontFamily } from '@/theme/linksman';
import { parseLocalDate } from '@/lib/date';
import type { TodayRoundSummary } from '@/lib/queries/today';

type Props = {
  best: TodayRoundSummary | null | undefined;
  latest: TodayRoundSummary | null | undefined;
  achievementsCount: number | undefined;
};

export function LedgerCard({ best, latest, achievementsCount }: Props) {
  const hasAny = !!best || !!latest || (achievementsCount ?? 0) > 0;

  if (!hasAny) {
    return (
      <View style={{ paddingVertical: 24, borderTopWidth: 0.5, borderColor: palette.ink + '22' }}>
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
          FROM YOUR LEDGER
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 24,
            color: palette.ink,
            opacity: 0.7,
            lineHeight: 24 * 1.3,
          }}
        >
          Your first card will live here.
        </Text>
      </View>
    );
  }

  const row = (label: string, value: string, onPress?: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingVertical: 14,
        borderTopWidth: 0.5,
        borderColor: palette.ink + '22',
      }}
    >
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 9 * 0.2,
          color: palette.ink,
          opacity: 0.55,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: fontFamily.display,
          fontSize: 18,
          color: palette.ink,
        }}
      >
        {value}
      </Text>
    </Pressable>
  );

  const fmtCard = (r: TodayRoundSummary) => {
    const diff = r.total_score - r.total_par;
    const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
    return `${r.total_score}  ${diffLabel}`;
  };

  return (
    <View style={{ paddingVertical: 24, borderTopWidth: 0.5, borderColor: palette.ink + '22' }}>
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
        FROM YOUR LEDGER
      </Text>
      {row(
        'BEST CARD',
        best ? fmtCard(best) : 'No card yet',
        best ? () => router.push({ pathname: '/round/[id]', params: { id: best.id } }) : undefined,
      )}
      {row(
        'LAST CARD',
        latest
          ? `${fmtCard(latest)}  ·  ${format(parseLocalDate(latest.played_at), 'MMM d').toUpperCase()}`
          : 'No card yet',
        latest
          ? () => router.push({ pathname: '/round/[id]', params: { id: latest.id } })
          : undefined,
      )}
      {row(
        'TROPHY CASE',
        (achievementsCount ?? 0) > 0 ? `${achievementsCount}` : 'Nothing yet — play a round.',
        (achievementsCount ?? 0) > 0 ? () => router.push('/achievements') : undefined,
      )}
    </View>
  );
}
```

- [ ] **Step 3: RegularsPulseCard**

```tsx
// components/RegularsPulseCard.tsx
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';

import { palette, fontFamily } from '@/theme/linksman';
import { parseLocalDate } from '@/lib/date';
import type { RegularsPulse } from '@/lib/queries/today';

type Props = { pulse: RegularsPulse | null | undefined };

export function RegularsPulseCard({ pulse }: Props) {
  return (
    <View style={{ paddingVertical: 24, borderTopWidth: 0.5, borderColor: palette.ink + '22' }}>
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
        FROM YOUR REGULARS
      </Text>
      {pulse ? (
        <Pressable
          onPress={() => router.push({ pathname: '/round/[id]', params: { id: pulse.round.id } })}
        >
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 22,
              color: palette.ink,
              lineHeight: 22 * 1.2,
            }}
          >
            {pulse.owner?.display_name ?? '—'} ·{' '}
            {pulse.round.courses?.name ?? 'Unknown course'}
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 12,
              color: palette.ink,
              opacity: 0.6,
              marginTop: 6,
            }}
          >
            {pulse.round.total_score} ({pulse.round.total_score - pulse.round.total_par >= 0 ? '+' : ''}
            {pulse.round.total_score - pulse.round.total_par}) ·{' '}
            {format(parseLocalDate(pulse.round.played_at), 'MMM d').toUpperCase()}
          </Text>
        </Pressable>
      ) : (
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 22,
            color: palette.ink,
            opacity: 0.7,
            lineHeight: 22 * 1.3,
          }}
        >
          Quiet on the wire.
        </Text>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Today screen composition**

Replace the placeholder `app/(app)/(tabs)/index.tsx` with the full screen:

```tsx
// app/(app)/(tabs)/index.tsx
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { Topo } from '@/components/Topo';
import { HomeCourseCard } from '@/components/HomeCourseCard';
import { LedgerCard } from '@/components/LedgerCard';
import { RegularsPulseCard } from '@/components/RegularsPulseCard';
import { useSession } from '@/lib/hooks/useSession';
import { useMyProfile, useHomeCourse } from '@/lib/queries/profile';
import { useBestCard, useLatestCard, useLatestRegularsPulse } from '@/lib/queries/today';
import { useAchievements } from '@/lib/queries/achievements';
import { palette, fontFamily } from '@/theme/linksman';

export default function Today() {
  const { session } = useSession();
  const userId = session?.user.id;
  const profileQ = useMyProfile(userId);
  const homeCourseQ = useHomeCourse(profileQ.data?.home_course_id);
  const bestQ = useBestCard(userId, profileQ.data?.home_course_id);
  const latestQ = useLatestCard(userId);
  const pulseQ = useLatestRegularsPulse(userId);
  const achievementsQ = useAchievements(userId);

  const todayLabel = format(new Date(), 'MMM d').toUpperCase();
  const dowLabel = format(new Date(), 'EEE').toUpperCase();

  return (
    <ScreenContainer surface="bone">
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.06 }}
      >
        <Topo seed="today" width={400} height={900} stroke={palette.ink + '40'} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View
          style={{
            paddingTop: 8,
            paddingBottom: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Wordmark size={20} color={palette.ink} />
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
            {dowLabel} · {todayLabel}
          </Text>
        </View>

        <HomeCourseCard course={homeCourseQ.data ?? null} />
        <LedgerCard
          best={bestQ.data}
          latest={latestQ.data}
          achievementsCount={(achievementsQ.data ?? []).length}
        />
        <RegularsPulseCard pulse={pulseQ.data} />

        <Pressable onPress={() => router.push('/(app)/(tabs)/feed')} style={{ paddingVertical: 24 }}>
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
            OPEN FEED FOR THE REST →
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
```

If `useAchievements` does not return `length`-friendly data (e.g. it returns an object), substitute the right field. Open `lib/queries/achievements.ts` to confirm the return shape and adapt the `achievementsCount` value accordingly.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npx eslint components/HomeCourseCard.tsx components/LedgerCard.tsx components/RegularsPulseCard.tsx "app/(app)/(tabs)/index.tsx"`
Expected: clean.

Smoke test on phone: launch app → land on Today. Confirm:
- Home Course module shows your home course (or "Pick where you play most.").
- "Start a card" routes into round-setup with home course pre-filled.
- "Change" routes into the home-course picker.
- LedgerCard shows your best/last/trophy counts when you have rounds; shows the "Your first card will live here." empty when you don't.
- RegularsPulseCard shows the most recent mutual round, or "Quiet on the wire." otherwise.
- "OPEN FEED FOR THE REST →" routes to the Feed tab.
- Date eyebrow looks comfortable; if cramped on small device, drop the day-of-week prefix.

- [ ] **Step 6: Commit**

```bash
git add components/HomeCourseCard.tsx components/LedgerCard.tsx components/RegularsPulseCard.tsx "app/(app)/(tabs)/index.tsx"
git commit -m "Phase 8: Today screen with three modules — Home Course, Ledger, Regulars Pulse"
```

---

## Task 13: Search tab — unified player+course search

**Files:**
- Modify: `app/(app)/(tabs)/search.tsx` (replace placeholder)
- Delete: `app/(app)/(tabs)/discover.tsx`
- Modify: `app/(app)/(tabs)/_layout.tsx` (drop the `discover` Tabs.Screen entry now that the file is gone)

- [ ] **Step 1: Rewrite the search screen**

```tsx
// app/(app)/(tabs)/search.tsx
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
  const followingQ = useFollowingList(viewerId, 5);

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
            onPress={() => router.push({ pathname: '/join-round', params: { code: trimmed.toUpperCase() } })}
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
            {(usersQ.data ?? []).length === 0 ? (
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
            ) : (
              (usersQ.data ?? [])
                .slice(0, 8)
                .map((u) => <UserListItem key={u.id} user={u} viewerId={viewerId} />)
            )}

            {eyebrow('COURSES')}
            {(coursesQ.data ?? []).length === 0 ? (
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
            ) : (
              (coursesQ.data ?? [])
                .slice(0, 8)
                .map((c) => (
                  <CourseListItem
                    key={c.id}
                    course={c}
                    onPress={() => router.push({ pathname: '/course/[id]', params: { id: c.id } })}
                  />
                ))
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

            {(followingQ.data?.length ?? 0) > 0 ? (
              <>
                {eyebrow('PEOPLE YOU FOLLOW')}
                {followingQ.data!.map((u) => (
                  <UserListItem key={u.id} user={u} viewerId={viewerId} />
                ))}
              </>
            ) : null}

            {(recentCoursesQ.data?.length ?? 0) === 0 && (followingQ.data?.length ?? 0) === 0 ? (
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
```

If `useFollowingList` does not exist with the signature `(userId, limit)` returning user-row data compatible with `UserListItem`, either:
- Add a new export to `lib/queries/follows.ts` matching that signature, OR
- Remove the `PEOPLE YOU FOLLOW` block from the empty state (recents-courses-only is acceptable for v1).

Open `lib/queries/follows.ts` and check what's available before adding new exports.

- [ ] **Step 2: Verify the join-round route accepts a `code` param**

Open `app/(app)/join-round.tsx` and check that the screen reads `code` from `useLocalSearchParams` and prefills the input. If it doesn't, either:
- Add a `useLocalSearchParams<{ code?: string }>()` read with a `useEffect` that calls `setCode(prefill.toUpperCase().slice(0, 6))` on mount, OR
- Keep the existing flow — when user lands on `/join-round`, they retype the code. Acceptable for v1.

- [ ] **Step 3: Delete Discover**

```bash
git rm "app/(app)/(tabs)/discover.tsx"
```

- [ ] **Step 4: Drop discover from tabs layout**

In `app/(app)/(tabs)/_layout.tsx`, remove the `<Tabs.Screen name="discover" options={{ href: null }} />` line and remove `'discover'` from the `name` union type.

- [ ] **Step 5: Audit any remaining `router.push('/discover')` calls**

Run: `grep -rn "discover" --include="*.tsx" --include="*.ts" app components lib`
Expected: no references left. If any exist, replace with `router.push('/(app)/(tabs)/search')`.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npx eslint "app/(app)/(tabs)/search.tsx" "app/(app)/(tabs)/_layout.tsx"`
Expected: clean.

Smoke test on phone: open Search tab. Type "ti" — confirm Players/Courses sections fill. Type a 6-char code — confirm JOIN ROUND row appears at top. Empty input — confirm Recently Played + People You Follow appear if data exists.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/(tabs)/search.tsx" "app/(app)/(tabs)/_layout.tsx"
git rm "app/(app)/(tabs)/discover.tsx"
git commit -m "Phase 8: unified Search tab; remove Discover"
```

---

## Task 14: Auth polish — welcome, sign-up, sign-in

**Files:**
- Modify: `app/(auth)/welcome.tsx`
- Modify: `app/(auth)/sign-up.tsx`
- Modify: `app/(auth)/sign-in.tsx`

- [ ] **Step 1: Welcome — lead positioning line, secondary brand line**

In `app/(auth)/welcome.tsx`, replace the existing "Quiet. Precise. Earned." block with:

```tsx
<View className="mt-[200px] items-center">
  <Text
    style={{
      fontFamily: fontFamily.mono,
      fontSize: 11,
      letterSpacing: 0.18 * 11,
      color: palette.ink,
      opacity: 0.55,
    }}
  >
    EST. MMXXV · GOLF JOURNAL
  </Text>
  <Text
    style={{
      fontFamily: fontFamily.display,
      fontSize: 28,
      letterSpacing: -28 * 0.02,
      color: palette.ink,
      marginTop: 16,
      textAlign: 'center',
      lineHeight: 28 * 1.2,
      paddingHorizontal: 16,
    }}
  >
    Private scorecards for the people you play with.
  </Text>
  <Text
    style={{
      fontFamily: fontFamily.mono,
      fontSize: 11,
      letterSpacing: 11 * 0.16,
      color: palette.ink,
      opacity: 0.5,
      marginTop: 12,
      textTransform: 'uppercase',
    }}
  >
    QUIET · PRECISE · EARNED
  </Text>
</View>
```

If iPhone SE shows visible crowding (CTAs pushed off-screen), drop the secondary `QUIET · PRECISE · EARNED` line. The positioning line is the priority.

- [ ] **Step 2: Sign-up — wordmark, legal text, larger tap target**

In `app/(auth)/sign-up.tsx`, locate the existing structure (back button at top, title, fields, CTA, "Already have an account? Sign in." link).

Add a Linksman wordmark at the top above the back button:

```tsx
import { Wordmark } from '@/components/Wordmark';

// at the top of the screen body, before the back button
<View style={{ alignItems: 'center', marginTop: 24, marginBottom: 24 }}>
  <Wordmark size={28} color={palette.ink} />
</View>
```

Below the primary CTA, add legal text:

```tsx
import * as WebBrowser from 'expo-web-browser';

// directly under the Create Account button
<View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 14 }}>
  <Text
    style={{
      fontFamily: fontFamily.mono,
      fontSize: 10,
      letterSpacing: 10 * 0.14,
      color: palette.ink,
      opacity: 0.55,
      textTransform: 'uppercase',
    }}
  >
    BY CREATING AN ACCOUNT YOU AGREE TO OUR{' '}
  </Text>
  <Pressable
    onPress={() =>
      WebBrowser.openBrowserAsync('https://gavin98gillespie.github.io/golf-app/legal/terms.html')
    }
  >
    <Text
      style={{
        fontFamily: fontFamily.mono,
        fontSize: 10,
        letterSpacing: 10 * 0.14,
        color: palette.fairway,
        textTransform: 'uppercase',
      }}
    >
      TERMS
    </Text>
  </Pressable>
  <Text
    style={{
      fontFamily: fontFamily.mono,
      fontSize: 10,
      letterSpacing: 10 * 0.14,
      color: palette.ink,
      opacity: 0.55,
      textTransform: 'uppercase',
    }}
  >
    {' '}AND{' '}
  </Text>
  <Pressable
    onPress={() =>
      WebBrowser.openBrowserAsync('https://gavin98gillespie.github.io/golf-app/legal/privacy.html')
    }
  >
    <Text
      style={{
        fontFamily: fontFamily.mono,
        fontSize: 10,
        letterSpacing: 10 * 0.14,
        color: palette.fairway,
        textTransform: 'uppercase',
      }}
    >
      PRIVACY
    </Text>
  </Pressable>
</View>
```

Find the "Already have an account? Sign in." Pressable. Wrap it (or add to its existing style) so it has a generous tap target:

```tsx
<Pressable
  onPress={() => router.push('/(auth)/sign-in')}
  hitSlop={12}
  style={{ paddingVertical: 12, paddingHorizontal: 16, alignSelf: 'center', marginTop: 16 }}
>
  <Text style={...}>Already have an account? Sign in.</Text>
</Pressable>
```

- [ ] **Step 3: Sign-in — same legal text + tap target parity**

Apply the same legal text block and the same "Don't have an account? Create one." tap-target enlargement to `app/(auth)/sign-in.tsx`. The Wordmark is optional on sign-in; add it if it preserves layout balance with sign-up.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx eslint "app/(auth)/welcome.tsx" "app/(auth)/sign-up.tsx" "app/(auth)/sign-in.tsx"`
Expected: clean.

Smoke test on phone: sign-out → welcome (confirm new lead line + secondary line), sign-up (confirm wordmark + legal text taps open browser, larger sign-in tap target), sign-in (parity).

- [ ] **Step 5: Commit**

```bash
git add "app/(auth)/welcome.tsx" "app/(auth)/sign-up.tsx" "app/(auth)/sign-in.tsx"
git commit -m "Phase 8: auth polish — positioning lead, wordmark, legal text, tap targets"
```

---

## Task 15: Final phone test + tag

After all 14 tasks ship, run the full Phase 8 success-criteria smoke test on phone before tagging.

- [ ] **Step 1: New-user smoke**

Use a fresh email or `you+phase8@gmail.com` to sign up.
1. Create account → email confirm if enabled → sign-in.
2. Profile-setup (existing Phase 1 flow).
3. Land on Onboarding → Home Course step. Pick a course OR skip.
4. Land on Regulars step. Search for an existing user. Follow them. Continue (or skip).
5. Land on Begin step. Confirm "YOUR LEDGER" eyebrow + course name (or "Linksman" if skipped) + three "No card yet" rows.
6. Tap "Start a card →". Confirm round-setup opens with home course pre-filled (or course picker if skipped).
7. Kill the app and reopen. Confirm landing on Today (no re-onboarding).

- [ ] **Step 2: Existing-user smoke**

Sign in with the long-standing test account.
1. Confirm landing on Today. Verify all three modules render correctly with real data.
2. Tap "OPEN FEED FOR THE REST →". Confirm Feed tab loads existing mutuals feed.
3. Tap Search tab. Type "te" — verify Players + Courses sections. Type a real 6-char code — verify JOIN ROUND row.
4. Tap Me. Verify SETTINGS link in header. Tap it. Verify Settings screen.
5. Confirm bottom nav reads `Today | Feed | [Play] | Search | Me`. Confirm Discover and Settings are not in the bar.

- [ ] **Step 3: Auth flow smoke**

Sign out. Welcome screen — verify new tagline. Sign-up screen — verify wordmark + legal text taps open browser. Sign-in screen — verify parity.

- [ ] **Step 4: Tag**

```bash
git tag phase-8 && git push origin phase-8
```

- [ ] **Step 5: Update `build_state.md`**

Edit `~/.claude/projects/-Users-gavingillespie-Desktop-Golf-App/memory/build_state.md` to add the Phase 8 entry under "What's shipped" with a one-paragraph summary, and revise the "Next phase" pointer to Phase 9 — Memory.

---

## Phase 8 success criteria

A new user can:
1. Create an account.
2. Pick or skip a home course (Step 1).
3. Search and follow at least one regular, or skip (Step 2).
4. See their ledger preview with home course (Step 3).
5. Tap "Start a card" and land in round-setup with home course pre-filled, or "Go to Today" and land on Today.
6. Reopen the app the next day and land on Today with all three modules populated by real data when available.

An existing user:
1. Lands on Today (no onboarding forced).
2. Reaches Feed in one tap.
3. Reaches Search in one tap, finds Players/Courses/Join Code there.
4. Reaches Settings via Me header link.

## Risk notes

- **Tab-bar touch targets.** With 4 surrounding items + a centered brass Play button, the centerpiece Play stays 5× larger than tab buttons. If the relabeled items wrap to two lines on small devices, shorten "Search" to a glyph or shorten "Today" similarly.
- **Onboarding kill-and-relaunch.** A user who quits between Step 1 and Step 3 returns to Step 1 (flag still false). Home course was already saved so step 1 will show it in the picker's home-course row if we don't pass `hideHomeCourseRow` — we do pass it, so the screen looks identical.
- **Empty Today on a fresh device.** A user who skips home course AND has no rounds AND no mutuals sees three "empty but intentional" modules. Confirm during smoke test that this looks right; if any module reads as broken-empty, tighten the copy.
- **`useAchievements` shape.** Task 12 assumes the hook returns an array. If it returns an object, patch the count read accordingly during Task 12 — do not modify the hook itself.
- **Settings route after move.** Task 10 moves `settings.tsx` out of `(tabs)`. Any existing `router.push('/(app)/(tabs)/settings')` calls break — do a grep at end of Task 10 and update to `/settings`.

