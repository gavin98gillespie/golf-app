# Phase 1 — Auth + Core Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** End-to-end functional core. By the end of Phase 1, the user can: sign up with email, complete profile setup, browse the course catalog, pick a course, score 18 holes hole-by-hole with mid-round draft autosave, save the round, and see it on their profile screen. No social features yet — those are Phase 3.

**Architecture:**
- Supabase JS client initialized once in `lib/supabase.ts`, reads env vars, exposes typed client (auto-generated types from DB schema).
- Database schema and RLS policies versioned via Supabase CLI migrations in `supabase/migrations/*.sql`. Applied via `supabase db push` to the remote project.
- Auth via Supabase email/password (no Sign in with Apple in v1 — see "Auth scope" callout below).
- Routing via Expo Router groups: `(auth)/` for unauthenticated screens, `(app)/` for authenticated screens with an auth-guard layout. Tabs live inside `(app)/(tabs)/`.
- TanStack Query for all server state (rounds, courses, profile). Zustand for transient UI state (e.g., the in-progress round's local form state).
- Mid-round draft persistence: every score edit writes to `round_holes` and sets `rounds.is_draft = true`. On app load, if a draft exists, surface "Resume your round" CTA.

**Tech Stack additions:**
- `@supabase/supabase-js` — Supabase client
- `react-native-url-polyfill` — required by Supabase on RN
- `@react-native-async-storage/async-storage` — Supabase auth session storage
- `@tanstack/react-query` — server state
- `zustand` — UI state
- `zod` — input validation at form boundaries
- `date-fns` — date formatting
- `expo-location` — GPS for "near me" course picker
- `supabase` CLI — local dev tool (not bundled), used for migrations

**Auth scope decision (deviation from spec):** The high-level spec called for Sign in with Apple as primary auth. **We're deferring SiwA to a future phase.** Apple's guideline 4.8 only requires SiwA when other 3rd-party auth providers (Google, Facebook, etc.) are also offered. Since v1 ships email-only, SiwA is not required for App Store approval. SiwA also requires native code → custom dev client → EAS Build, which adds complexity to the test loop. Email-only keeps Phase 1 testable entirely in Expo Go. Document this decision in the design doc on commit. SiwA can be added later when we add Google/Apple/etc. or as part of pre-launch polish in Phase 4.

**OSM course seed (deviation from spec):** Originally Phase 1 was to import ~30k OSM courses upfront. Rescoping: the OSM seed is **moved to Task 14 (last)** in this phase and is **optional for the Phase 1 gate**. The Phase 1 gate is achievable with zero seeded courses because users can add a course manually in 30 seconds via the "Add new course" UI flow. OSM seed remains on the roadmap for Phase 2 / pre-TestFlight, but doesn't block end-to-end scoring functionality.

**Working directory:** `/Users/gavingillespie/Desktop/Golf App/` (Phase 0 already shipped — Expo SDK 54, NativeWind, Inter, theme module in place).

---

## Auth flow (mental model — read this before Tasks 4–6)

```
[User opens app]
       ↓
[Root layout: load fonts + check auth session]
       ↓
   ┌───┴───┐
   │       │
[no sess] [has sess]
   ↓        ↓
(auth)/   [profile exists?]
   ↓        ┌──┴──┐
[welcome]  no    yes
   ↓       ↓     ↓
[sign-in/  (auth)/  (app)/
 sign-up]  profile- (tabs)/
   ↓       setup    [feed | discover | +round | profile]
[verify
 email
 if req]
   ↓
[create
 profile]
```

After sign-up, the user has an `auth.users` row but no `profiles` row. The auth-guard at `(app)/_layout.tsx` checks for both: signed-in **and** profile complete. If signed-in but no profile, it redirects to `/(auth)/profile-setup` instead of `/(auth)/sign-in`.

---

## File Structure (new files added in Phase 1)

```
supabase/
├── config.toml                                 # Supabase CLI config
├── migrations/
│   ├── 0001_init_schema.sql                    # 5 tables: profiles, courses, course_holes, rounds, round_holes
│   ├── 0002_init_rls.sql                       # RLS policies (Phase 1: owner-only writes; public reads for courses)
│   └── 0003_helper_functions.sql               # is_username_available(), other helpers
└── seed/
    └── README.md                               # Notes on seed strategy

scripts/
└── seed-osm-courses.ts                         # Optional OSM importer (Task 14, deferred-OK)

lib/
├── supabase.ts                                 # Supabase client init (typed via Database type)
├── database.types.ts                           # Auto-generated from Supabase schema
├── auth.ts                                     # signUp, signIn, signOut, getSession helpers
├── env.ts                                      # Reads + validates EXPO_PUBLIC_* env vars at import time
└── queries/
    ├── profile.ts                              # useProfile, useUpdateProfile, useCheckUsername
    ├── courses.ts                              # useCourseSearch, useNearbyCoursesQuery, useCreateCourse
    └── rounds.ts                               # useRound, useUserRounds, useCreateRound, useScoreHole, useFinalizeRound, useDraftRound

components/
├── Button.tsx                                  # Primary / secondary CTA, with disabled + loading states
├── Input.tsx                                   # Text input with label + error
├── ScreenContainer.tsx                         # Safe area + dark bg consistent across screens
├── ScoreStepper.tsx                            # +/− with score number; tap or vertical swipe
├── HoleProgressBar.tsx                         # Top of scoring screen
├── CourseListItem.tsx                          # Row in course picker
└── RoundListItem.tsx                           # Row on profile

app/
├── (auth)/
│   ├── _layout.tsx                             # Stack, no header, redirects to /(app) if already authed-with-profile
│   ├── welcome.tsx                             # "Get started" / "I have an account"
│   ├── sign-up.tsx                             # email + password
│   ├── sign-in.tsx                             # email + password
│   └── profile-setup.tsx                       # username + display name (post-signup)
└── (app)/
    ├── _layout.tsx                             # Auth guard; redirects unauth to /(auth)/welcome
    ├── (tabs)/
    │   ├── _layout.tsx                         # 4 tabs: Home, Discover, +Round, Profile
    │   ├── index.tsx                           # Feed placeholder (real feed is Phase 3)
    │   ├── discover.tsx                        # Course search (Phase 1) + people search placeholder
    │   ├── start.tsx                           # Redirects to /round/new/course (the +Round tab)
    │   └── profile.tsx                         # Your profile + rounds list
    ├── round/
    │   ├── new/
    │   │   ├── course.tsx                      # Course picker (search + nearby + add new)
    │   │   ├── setup.tsx                       # Tee box + holes + date
    │   │   ├── score.tsx                       # Hole-by-hole entry (uses ?hole= query param)
    │   │   └── summary.tsx                     # Review + save
    │   └── [id].tsx                            # Round detail (read-only view of saved round)
    └── settings.tsx                            # Sign out + account info (delete account stub)
```

---

## Task 1: Supabase client + env validation

**Files:**
- Create: `lib/env.ts`, `lib/supabase.ts`
- Modify: `package.json` (deps), `app/_layout.tsx` (URL polyfill import)

- [ ] **Step 1.1: Install dependencies**

  ```bash
  npx expo install @supabase/supabase-js react-native-url-polyfill @react-native-async-storage/async-storage
  ```

- [ ] **Step 1.2: Create `lib/env.ts`**

  ```ts
  /**
   * Validates required env vars at module load. Throws clearly if missing
   * so we fail at boot, not deep inside a feature with a cryptic null error.
   */
  function required(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(
        `Missing required env var: ${name}. ` +
          `Copy .env.example to .env.local and fill in real values from your Supabase project.`,
      );
    }
    return value;
  }

  export const env = {
    SUPABASE_URL: required('EXPO_PUBLIC_SUPABASE_URL'),
    SUPABASE_ANON_KEY: required('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  } as const;
  ```

- [ ] **Step 1.3: Create `lib/supabase.ts`**

  ```ts
  import 'react-native-url-polyfill/auto';

  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { createClient } from '@supabase/supabase-js';

  import { env } from './env';

  // Database type comes from Task 4. For Task 1, we use `any` and tighten in Task 4.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Database = any;

  export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // we're not using OAuth redirects in v1
    },
  });
  ```

- [ ] **Step 1.4: Add URL polyfill at app entry**

  Modify `app/_layout.tsx` — add as the very first import (before `'../global.css'`):

  ```tsx
  import 'react-native-url-polyfill/auto';

  import '../global.css';
  // ... rest unchanged
  ```

- [ ] **Step 1.5: Smoke test the client boots**

  Modify `app/index.tsx` temporarily — add a useEffect that calls `supabase.auth.getSession()` and logs the result:

  ```tsx
  import { useEffect } from 'react';
  import { Text, View } from 'react-native';
  import { colors } from '@/theme';
  import { supabase } from '@/lib/supabase';

  export default function Index() {
    useEffect(() => {
      void supabase.auth.getSession().then(({ data, error }) => {
        // eslint-disable-next-line no-console
        console.log('[supabase] session check:', { hasSession: !!data.session, error });
      });
    }, []);

    return (
      <View className="flex-1 items-center justify-center bg-bg-base">
        <Text className="text-text-primary text-5xl font-light tracking-tight">Hello, Golf</Text>
        <Text className="text-text-secondary text-sm mt-2 tracking-wider uppercase">
          Phase 1 · Setup
        </Text>
        <View
          className="mt-6 px-3 py-1 rounded-full"
          style={{
            backgroundColor: colors.accentSoft,
            borderColor: colors.accent,
            borderWidth: 1,
          }}
        >
          <Text className="text-xs" style={{ color: colors.accent }}>
            v0.0.2
          </Text>
        </View>
      </View>
    );
  }
  ```

- [ ] **Step 1.6: Run on phone, confirm log**

  Start `npx expo start --clear`. Reload the app on your iPhone. In the Metro terminal, you should see:
  `[supabase] session check: { hasSession: false, error: null }`
  No errors → client is talking to your Supabase project successfully.

- [ ] **Step 1.7: Commit**

  ```bash
  git add -A
  git commit -m "feat: add Supabase client with env validation"
  git push origin main
  ```

---

## Task 2: Supabase CLI + project link

**Files:**
- Create: `supabase/config.toml` (auto-generated), `supabase/.gitignore`
- Modify: `.gitignore` (ensure `supabase/.temp` ignored)

- [ ] **Step 2.1: Install Supabase CLI as a dev dependency (not global)**

  ```bash
  npm install --save-dev supabase --legacy-peer-deps
  ```

  Verify: `npx supabase --version` should print a version number.

- [ ] **Step 2.2: Initialize Supabase config**

  ```bash
  npx supabase init
  ```

  When asked "Generate VS Code settings for Deno?" answer **n** (we don't need it for v1).

  This creates `supabase/config.toml` and `supabase/.gitignore`.

- [ ] **Step 2.3: Link project to remote**

  Find your project ref in your Supabase dashboard URL (`https://supabase.com/dashboard/project/<REF>`).

  ```bash
  npx supabase link --project-ref <REF>
  ```

  When prompted for the database password, paste the one you saved when creating the project.

- [ ] **Step 2.4: Verify link**

  ```bash
  npx supabase db remote list
  ```

  Expected: lists your remote project. No errors.

- [ ] **Step 2.5: Add an npm script for migrations**

  Add to `package.json` `scripts`:

  ```json
  "db:push": "supabase db push",
  "db:types": "supabase gen types typescript --linked > lib/database.types.ts"
  ```

- [ ] **Step 2.6: Commit**

  ```bash
  git add -A
  git commit -m "chore: install Supabase CLI and link remote project"
  git push origin main
  ```

---

## Task 3: Schema migration (5 tables)

**Files:** create `supabase/migrations/0001_init_schema.sql`

- [ ] **Step 3.1: Create migration via CLI**

  ```bash
  npx supabase migration new init_schema
  ```

  This creates `supabase/migrations/<timestamp>_init_schema.sql` (the timestamp is the file ordering key — leave it as-is).

- [ ] **Step 3.2: Write the schema SQL**

  Replace the empty migration file's contents with EXACTLY this SQL:

  ```sql
  -- ============================================================================
  -- Phase 1 schema: profiles, courses, course_holes, rounds, round_holes
  -- ============================================================================

  -- Required extensions
  CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- trigram fuzzy search on course names
  CREATE EXTENSION IF NOT EXISTS pgcrypto;       -- gen_random_uuid()

  -- ----------------------------------------------------------------------------
  -- profiles  -- public-facing identity, 1:1 with auth.users
  -- ----------------------------------------------------------------------------
  CREATE TABLE profiles (
    id              UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username        TEXT         UNIQUE NOT NULL CHECK (
                                  username ~ '^[a-z0-9_]{3,30}$'
                                ),
    display_name    TEXT         NOT NULL CHECK (length(display_name) BETWEEN 1 AND 60),
    avatar_url      TEXT,
    bio             TEXT         CHECK (bio IS NULL OR length(bio) <= 280),
    home_course_id  UUID,         -- FK added after courses table exists
    is_private      BOOLEAN      NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
  );

  CREATE INDEX profiles_username_idx ON profiles(username);

  -- ----------------------------------------------------------------------------
  -- courses
  -- ----------------------------------------------------------------------------
  CREATE TABLE courses (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT         NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
    city            TEXT,
    state           TEXT,
    country         TEXT         NOT NULL DEFAULT 'US',
    lat             NUMERIC(9,6),
    lng             NUMERIC(9,6),
    hole_count      INT          NOT NULL DEFAULT 18 CHECK (hole_count IN (9, 18, 27, 36)),
    source          TEXT         NOT NULL CHECK (source IN ('osm', 'user')),
    added_by        UUID         REFERENCES profiles(id) ON DELETE SET NULL,
    verified        BOOLEAN      NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
  );

  CREATE INDEX courses_name_trgm_idx ON courses USING gin (name gin_trgm_ops);
  CREATE INDEX courses_lat_lng_idx ON courses(lat, lng);
  CREATE INDEX courses_country_state_idx ON courses(country, state);

  -- Now we can add the FK from profiles → courses
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_home_course_fkey
    FOREIGN KEY (home_course_id) REFERENCES courses(id) ON DELETE SET NULL;

  -- ----------------------------------------------------------------------------
  -- course_holes
  -- ----------------------------------------------------------------------------
  CREATE TABLE course_holes (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    hole_number     INT          NOT NULL CHECK (hole_number BETWEEN 1 AND 36),
    par             INT          NOT NULL CHECK (par BETWEEN 3 AND 6),
    yardage         INT          CHECK (yardage IS NULL OR yardage > 0),
    tee_box         TEXT         NOT NULL DEFAULT 'default',
    UNIQUE (course_id, hole_number, tee_box)
  );

  CREATE INDEX course_holes_course_idx ON course_holes(course_id);

  -- ----------------------------------------------------------------------------
  -- rounds
  -- ----------------------------------------------------------------------------
  CREATE TABLE rounds (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id       UUID         NOT NULL REFERENCES courses(id),
    tee_box         TEXT         NOT NULL DEFAULT 'default',
    played_at       DATE         NOT NULL DEFAULT current_date,
    total_score     INT          NOT NULL DEFAULT 0,
    total_par       INT          NOT NULL DEFAULT 0,
    notes           TEXT         CHECK (notes IS NULL OR length(notes) <= 500),
    visibility      TEXT         NOT NULL DEFAULT 'mutuals' CHECK (
                                  visibility IN ('private', 'mutuals', 'public')
                                ),
    is_draft        BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
  );

  CREATE INDEX rounds_user_played_idx ON rounds(user_id, played_at DESC);
  CREATE INDEX rounds_user_draft_idx  ON rounds(user_id, is_draft) WHERE is_draft = true;

  -- ----------------------------------------------------------------------------
  -- round_holes
  -- ----------------------------------------------------------------------------
  CREATE TABLE round_holes (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id        UUID         NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    hole_number     INT          NOT NULL CHECK (hole_number BETWEEN 1 AND 36),
    score           INT          NOT NULL CHECK (score BETWEEN 1 AND 20),
    par             INT          NOT NULL CHECK (par BETWEEN 3 AND 6),
    putts           INT          CHECK (putts IS NULL OR putts BETWEEN 0 AND 10),
    fairway_hit     BOOLEAN,
    gir             BOOLEAN,
    UNIQUE (round_id, hole_number)
  );

  CREATE INDEX round_holes_round_idx ON round_holes(round_id);

  -- ----------------------------------------------------------------------------
  -- updated_at triggers
  -- ----------------------------------------------------------------------------
  CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$;

  CREATE TRIGGER profiles_set_updated_at
    BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();

  CREATE TRIGGER rounds_set_updated_at
    BEFORE UPDATE ON rounds FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();
  ```

- [ ] **Step 3.3: Apply to remote**

  ```bash
  npm run db:push
  ```

  When prompted, confirm.

  Expected: success message listing the migration file as applied.

- [ ] **Step 3.4: Verify in Supabase Dashboard**

  Go to your project → Table Editor. You should see all 5 tables: `profiles`, `courses`, `course_holes`, `rounds`, `round_holes`.

- [ ] **Step 3.5: Commit**

  ```bash
  git add supabase/migrations
  git commit -m "feat(db): add Phase 1 schema (profiles, courses, course_holes, rounds, round_holes)"
  git push origin main
  ```

---

## Task 4: RLS policies + helper functions

**Files:** create `supabase/migrations/<timestamp>_init_rls.sql` and `<timestamp>_helper_functions.sql`

- [ ] **Step 4.1: Create RLS migration**

  ```bash
  npx supabase migration new init_rls
  ```

  Replace its contents with:

  ```sql
  -- ============================================================================
  -- Phase 1 RLS policies. Phase 3 will add mutual-aware policies for rounds.
  -- ============================================================================

  -- ----------------------------------------------------------------------------
  -- profiles
  -- ----------------------------------------------------------------------------
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

  -- Anyone authenticated can read public-facing profile fields of any profile.
  -- (Bio + home_course gating to mutuals comes in Phase 3 — for now we just allow
  -- read of all profile fields if authed.)
  CREATE POLICY "profiles_read_authenticated"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

  -- Owner can insert their own profile (post-signup).
  CREATE POLICY "profiles_insert_own"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

  -- Owner can update their own profile.
  CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

  -- No DELETE policy — account deletion happens via Supabase auth flow,
  -- which cascades via the FK from profiles.id → auth.users.id.

  -- ----------------------------------------------------------------------------
  -- courses + course_holes
  -- ----------------------------------------------------------------------------
  ALTER TABLE courses        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE course_holes   ENABLE ROW LEVEL SECURITY;

  -- Anyone authenticated can read all courses / course_holes (public catalog).
  CREATE POLICY "courses_read_authenticated"
    ON courses FOR SELECT TO authenticated USING (true);

  CREATE POLICY "course_holes_read_authenticated"
    ON course_holes FOR SELECT TO authenticated USING (true);

  -- Anyone authenticated can add a new course (crowdsourced model).
  -- We require `source = 'user'` and `added_by = self`.
  CREATE POLICY "courses_insert_authenticated"
    ON courses FOR INSERT TO authenticated
    WITH CHECK (source = 'user' AND added_by = auth.uid());

  -- Anyone authenticated can add holes to courses they added or unverified courses
  -- (so users can fill in par/yardage as they score). Once verified=true, only
  -- admins can mutate (admin role is added in Phase 4 / pre-launch).
  CREATE POLICY "course_holes_insert_authenticated"
    ON course_holes FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = course_holes.course_id
          AND c.verified = false
      )
    );

  CREATE POLICY "course_holes_update_authenticated"
    ON course_holes FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = course_holes.course_id
          AND c.verified = false
      )
    );

  -- ----------------------------------------------------------------------------
  -- rounds + round_holes  (Phase 1: owner-only; Phase 3 expands to mutuals)
  -- ----------------------------------------------------------------------------
  ALTER TABLE rounds        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE round_holes   ENABLE ROW LEVEL SECURITY;

  -- Phase 1: only the owner can read their own rounds.
  CREATE POLICY "rounds_read_own"
    ON rounds FOR SELECT TO authenticated
    USING (user_id = auth.uid());

  CREATE POLICY "rounds_insert_own"
    ON rounds FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "rounds_update_own"
    ON rounds FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "rounds_delete_own"
    ON rounds FOR DELETE TO authenticated
    USING (user_id = auth.uid());

  -- round_holes inherit visibility from parent round
  CREATE POLICY "round_holes_read_via_round"
    ON round_holes FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM rounds r
        WHERE r.id = round_holes.round_id
          AND r.user_id = auth.uid()
      )
    );

  CREATE POLICY "round_holes_write_via_round"
    ON round_holes FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM rounds r
        WHERE r.id = round_holes.round_id
          AND r.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM rounds r
        WHERE r.id = round_holes.round_id
          AND r.user_id = auth.uid()
      )
    );
  ```

- [ ] **Step 4.2: Create helper functions migration**

  ```bash
  npx supabase migration new helper_functions
  ```

  Replace its contents:

  ```sql
  -- ============================================================================
  -- Helper RPC functions callable from the client
  -- ============================================================================

  -- Check if a username is available (case-insensitive). Returns boolean.
  -- Used during profile setup before insert to give immediate UX feedback.
  CREATE OR REPLACE FUNCTION public.is_username_available(check_username TEXT)
    RETURNS BOOLEAN
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT NOT EXISTS (
        SELECT 1 FROM profiles WHERE lower(username) = lower(check_username)
      );
    $$;

  GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT) TO authenticated;
  ```

- [ ] **Step 4.3: Apply migrations**

  ```bash
  npm run db:push
  ```

- [ ] **Step 4.4: Verify policies in dashboard**

  Supabase Dashboard → Authentication → Policies. You should see policies listed for each table. Each table should have RLS enabled (green shield icon).

- [ ] **Step 4.5: Commit**

  ```bash
  git add supabase/migrations
  git commit -m "feat(db): add Phase 1 RLS policies and is_username_available helper"
  git push origin main
  ```

---

## Task 5: Generate TypeScript types from DB

**Files:** create `lib/database.types.ts`, modify `lib/supabase.ts`

- [ ] **Step 5.1: Generate types**

  ```bash
  npm run db:types
  ```

  This writes `lib/database.types.ts` based on the live remote schema.

- [ ] **Step 5.2: Wire types into the client**

  Replace `lib/supabase.ts`:

  ```ts
  import 'react-native-url-polyfill/auto';

  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { createClient } from '@supabase/supabase-js';

  import { env } from './env';
  import type { Database } from './database.types';

  export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  export type Tables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Row'];
  export type Inserts<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Insert'];
  export type Updates<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Update'];
  ```

- [ ] **Step 5.3: Verify TS compiles**

  ```bash
  npm run typecheck
  ```

  Expected: clean.

- [ ] **Step 5.4: Commit**

  ```bash
  git add -A
  git commit -m "feat: generate typed Supabase client from DB schema"
  git push origin main
  ```

---

## Task 6: TanStack Query + Zustand setup

**Files:** modify `app/_layout.tsx`, create `lib/queryClient.ts`

- [ ] **Step 6.1: Install**

  ```bash
  npx expo install @tanstack/react-query zustand zod date-fns
  ```

- [ ] **Step 6.2: Create `lib/queryClient.ts`**

  ```ts
  import { QueryClient } from '@tanstack/react-query';

  export const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // 30s — most data we read isn't changing constantly
        retry: 1,
      },
    },
  });
  ```

- [ ] **Step 6.3: Provider in root layout**

  Update `app/_layout.tsx` — wrap the existing return with `QueryClientProvider`:

  ```tsx
  import 'react-native-url-polyfill/auto';

  import '../global.css';

  import { useEffect } from 'react';
  import { Stack } from 'expo-router';
  import { StatusBar } from 'expo-status-bar';
  import * as SplashScreen from 'expo-splash-screen';
  import { QueryClientProvider } from '@tanstack/react-query';
  import {
    useFonts,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  } from '@expo-google-fonts/inter';

  import { queryClient } from '@/lib/queryClient';

  SplashScreen.preventAutoHideAsync();

  export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
      Inter_300Light,
      Inter_400Regular,
      Inter_500Medium,
      Inter_600SemiBold,
      Inter_700Bold,
    });

    useEffect(() => {
      if (fontsLoaded || fontError) {
        SplashScreen.hideAsync();
      }
    }, [fontsLoaded, fontError]);

    if (!fontsLoaded && !fontError) {
      return null;
    }

    return (
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    );
  }
  ```

- [ ] **Step 6.4: Verify boot**

  `npx expo start --clear` — boots clean, no errors. Reload on phone, "Hello, Golf" still renders.
  `npm run typecheck` — clean.

- [ ] **Step 6.5: Commit**

  ```bash
  git add -A
  git commit -m "feat: add TanStack Query, Zustand, Zod, date-fns"
  git push origin main
  ```

---

## Task 7: Auth helpers + session hook

**Files:** create `lib/auth.ts`, create `lib/queries/profile.ts`, create `lib/hooks/useSession.ts`

- [ ] **Step 7.1: Create `lib/auth.ts`**

  ```ts
  import { supabase } from './supabase';

  export type AuthError = { message: string };

  export async function signUp(
    email: string,
    password: string,
  ): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error ? { message: error.message } : null };
  }

  export async function signIn(
    email: string,
    password: string,
  ): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? { message: error.message } : null };
  }

  export async function signOut(): Promise<void> {
    await supabase.auth.signOut();
  }
  ```

- [ ] **Step 7.2: Create `lib/hooks/useSession.ts`**

  ```ts
  import { useEffect, useState } from 'react';
  import type { Session } from '@supabase/supabase-js';

  import { supabase } from '@/lib/supabase';

  /**
   * Tracks the current Supabase auth session. Returns `undefined` while
   * loading the initial session, then the session (or null).
   */
  export function useSession(): { session: Session | null; loading: boolean } {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      void supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      });

      const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
      });

      return () => {
        data.subscription.unsubscribe();
      };
    }, []);

    return { session, loading };
  }
  ```

- [ ] **Step 7.3: Create `lib/queries/profile.ts`**

  ```ts
  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

  import { supabase, type Tables, type Inserts } from '@/lib/supabase';

  export function useMyProfile(userId: string | undefined) {
    return useQuery({
      queryKey: ['profile', userId],
      queryFn: async () => {
        if (!userId) return null;
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (error) throw error;
        return data as Tables<'profiles'> | null;
      },
      enabled: !!userId,
    });
  }

  export function useCheckUsername() {
    return useMutation({
      mutationFn: async (username: string) => {
        const { data, error } = await supabase.rpc('is_username_available', {
          check_username: username,
        });
        if (error) throw error;
        return data as boolean;
      },
    });
  }

  export function useCreateProfile() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: Inserts<'profiles'>) => {
        const { data, error } = await supabase
          .from('profiles')
          .insert(input)
          .select()
          .single();
        if (error) throw error;
        return data as Tables<'profiles'>;
      },
      onSuccess: (profile) => {
        qc.setQueryData(['profile', profile.id], profile);
      },
    });
  }
  ```

- [ ] **Step 7.4: Verify**

  `npm run typecheck` — clean. The Tables/Inserts generic types should resolve.

- [ ] **Step 7.5: Commit**

  ```bash
  git add -A
  git commit -m "feat: add auth helpers, useSession hook, profile queries"
  git push origin main
  ```

---

## Task 8: Welcome / Sign-up / Sign-in screens

**Files:** create `app/(auth)/_layout.tsx`, `app/(auth)/welcome.tsx`, `app/(auth)/sign-up.tsx`, `app/(auth)/sign-in.tsx`, components `Button.tsx`, `Input.tsx`, `ScreenContainer.tsx`. Modify `app/index.tsx` to redirect.

- [ ] **Step 8.1: Create reusable components**

  Create `components/ScreenContainer.tsx`:

  ```tsx
  import type { PropsWithChildren } from 'react';
  import { View } from 'react-native';
  import { SafeAreaView } from 'react-native-safe-area-context';

  export function ScreenContainer({ children }: PropsWithChildren) {
    return (
      <SafeAreaView className="flex-1 bg-bg-base">
        <View className="flex-1 px-6">{children}</View>
      </SafeAreaView>
    );
  }
  ```

  Create `components/Button.tsx`:

  ```tsx
  import { Pressable, Text, ActivityIndicator } from 'react-native';

  type Variant = 'primary' | 'secondary';

  type Props = {
    onPress: () => void;
    label: string;
    variant?: Variant;
    disabled?: boolean;
    loading?: boolean;
  };

  export function Button({ onPress, label, variant = 'primary', disabled, loading }: Props) {
    const isDisabled = disabled || loading;
    const base = 'rounded-full px-6 py-4 items-center justify-center';
    const colors =
      variant === 'primary'
        ? isDisabled
          ? 'bg-border-subtle'
          : 'bg-accent active:opacity-80'
        : isDisabled
          ? 'border border-border-subtle'
          : 'border border-text-secondary active:opacity-70';
    const textColor = variant === 'primary' ? 'text-bg-base' : 'text-text-primary';

    return (
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        className={`${base} ${colors}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text className={`${textColor} font-semibold text-base`}>{label}</Text>
        )}
      </Pressable>
    );
  }
  ```

  Create `components/Input.tsx`:

  ```tsx
  import { TextInput, View, Text } from 'react-native';
  import type { TextInputProps } from 'react-native';

  type Props = TextInputProps & {
    label: string;
    error?: string;
  };

  export function Input({ label, error, ...rest }: Props) {
    return (
      <View className="mb-4">
        <Text className="text-text-secondary text-xs uppercase tracking-wider mb-2">{label}</Text>
        <TextInput
          placeholderTextColor="#4a5a52"
          {...rest}
          className={`bg-bg-elevated border rounded-xl px-4 py-3 text-text-primary text-base ${
            error ? 'border-red-500' : 'border-border-subtle'
          }`}
        />
        {error ? <Text className="text-red-500 text-xs mt-1">{error}</Text> : null}
      </View>
    );
  }
  ```

- [ ] **Step 8.2: Create `(auth)/_layout.tsx`**

  ```tsx
  import { Stack } from 'expo-router';

  export default function AuthLayout() {
    return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
  }
  ```

- [ ] **Step 8.3: Create `(auth)/welcome.tsx`**

  ```tsx
  import { Text, View } from 'react-native';
  import { router } from 'expo-router';

  import { Button } from '@/components/Button';
  import { ScreenContainer } from '@/components/ScreenContainer';

  export default function Welcome() {
    return (
      <ScreenContainer>
        <View className="flex-1 justify-center">
          <Text className="text-text-primary text-5xl font-light tracking-tight">Golf App</Text>
          <Text className="text-text-secondary text-base mt-3 leading-6">
            Track your scorecards. Follow your friends. See where the day takes you.
          </Text>
        </View>
        <View className="pb-6 gap-3">
          <Button label="Get started" onPress={() => router.push('/(auth)/sign-up')} />
          <Button
            label="I have an account"
            variant="secondary"
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </View>
      </ScreenContainer>
    );
  }
  ```

- [ ] **Step 8.4: Create `(auth)/sign-up.tsx`**

  ```tsx
  import { useState } from 'react';
  import { Text, View, KeyboardAvoidingView, Platform } from 'react-native';
  import { router } from 'expo-router';
  import { z } from 'zod';

  import { Button } from '@/components/Button';
  import { Input } from '@/components/Input';
  import { ScreenContainer } from '@/components/ScreenContainer';
  import { signUp } from '@/lib/auth';

  const Schema = z.object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'At least 8 characters'),
  });

  export default function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit() {
      setError(null);
      const parsed = Schema.safeParse({ email, password });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'Invalid input');
        return;
      }
      setLoading(true);
      const { error: authError } = await signUp(parsed.data.email, parsed.data.password);
      setLoading(false);
      if (authError) {
        setError(authError.message);
        return;
      }
      router.replace('/(auth)/profile-setup');
    }

    return (
      <ScreenContainer>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="flex-1 justify-center">
            <Text className="text-text-primary text-3xl font-light tracking-tight mb-2">
              Create your account
            </Text>
            <Text className="text-text-secondary text-sm mb-8">
              Email and password. We'll add other sign-in options later.
            </Text>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
            />
            {error ? <Text className="text-red-500 text-sm mb-4">{error}</Text> : null}
            <Button label="Create account" onPress={onSubmit} loading={loading} />
          </View>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }
  ```

- [ ] **Step 8.5: Create `(auth)/sign-in.tsx`**

  Same shape as sign-up but calls `signIn` and redirects to `/(app)/(tabs)`. Replace any `signUp` calls accordingly. Use the same `Schema` validation.

  ```tsx
  import { useState } from 'react';
  import { Text, View, KeyboardAvoidingView, Platform } from 'react-native';
  import { router } from 'expo-router';
  import { z } from 'zod';

  import { Button } from '@/components/Button';
  import { Input } from '@/components/Input';
  import { ScreenContainer } from '@/components/ScreenContainer';
  import { signIn } from '@/lib/auth';

  const Schema = z.object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(1, 'Required'),
  });

  export default function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit() {
      setError(null);
      const parsed = Schema.safeParse({ email, password });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'Invalid input');
        return;
      }
      setLoading(true);
      const { error: authError } = await signIn(parsed.data.email, parsed.data.password);
      setLoading(false);
      if (authError) {
        setError(authError.message);
        return;
      }
      router.replace('/(app)/(tabs)');
    }

    return (
      <ScreenContainer>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="flex-1 justify-center">
            <Text className="text-text-primary text-3xl font-light tracking-tight mb-2">
              Welcome back
            </Text>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
            />
            {error ? <Text className="text-red-500 text-sm mb-4">{error}</Text> : null}
            <Button label="Sign in" onPress={onSubmit} loading={loading} />
          </View>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }
  ```

- [ ] **Step 8.6: Update `app/index.tsx` as the auth router**

  ```tsx
  import { useEffect } from 'react';
  import { router } from 'expo-router';

  import { useSession } from '@/lib/hooks/useSession';

  export default function Index() {
    const { session, loading } = useSession();

    useEffect(() => {
      if (loading) return;
      if (session) {
        router.replace('/(app)/(tabs)');
      } else {
        router.replace('/(auth)/welcome');
      }
    }, [session, loading]);

    return null;
  }
  ```

- [ ] **Step 8.7: USER ACTION — disable email confirmation in Supabase (dev only)**

  Sign-up flows in Supabase by default require the user to click a verification link before they can sign in. For dev iteration this is annoying. **Disable for now** and re-enable before TestFlight in Phase 4:

  Supabase Dashboard → Authentication → Providers → Email → toggle "Confirm email" **off** → save.

  Document this in `supabase/seed/README.md`:

  ```markdown
  # Supabase configuration notes

  ## Email confirmation

  Disabled during dev so account creation is instant. **Re-enable before TestFlight (Phase 4).**

  Dashboard → Authentication → Providers → Email → "Confirm email" toggle.
  ```

- [ ] **Step 8.8: Verify**

  `npm run typecheck` clean. Reload app on phone — should land on Welcome screen since you have no session.

- [ ] **Step 8.9: Commit**

  ```bash
  git add -A
  git commit -m "feat: add Welcome, Sign Up, and Sign In screens with email auth"
  git push origin main
  ```

---

## Task 9: Profile setup + auth-guarded app shell

**Files:** create `app/(auth)/profile-setup.tsx`, `app/(app)/_layout.tsx`, `app/(app)/(tabs)/_layout.tsx`, plus tab placeholder screens.

- [ ] **Step 9.1: Create `(auth)/profile-setup.tsx`**

  ```tsx
  import { useState } from 'react';
  import { Text, View, KeyboardAvoidingView, Platform } from 'react-native';
  import { router } from 'expo-router';
  import { z } from 'zod';

  import { Button } from '@/components/Button';
  import { Input } from '@/components/Input';
  import { ScreenContainer } from '@/components/ScreenContainer';
  import { useSession } from '@/lib/hooks/useSession';
  import { useCheckUsername, useCreateProfile } from '@/lib/queries/profile';

  const Schema = z.object({
    username: z
      .string()
      .min(3, 'At least 3 characters')
      .max(30, 'At most 30')
      .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, underscore'),
    displayName: z.string().min(1, 'Required').max(60, 'At most 60'),
  });

  export default function ProfileSetup() {
    const { session } = useSession();
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const checkUsername = useCheckUsername();
    const createProfile = useCreateProfile();

    async function onSubmit() {
      setError(null);
      if (!session) {
        setError('No session. Sign in again.');
        return;
      }
      const parsed = Schema.safeParse({ username, displayName });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'Invalid input');
        return;
      }
      try {
        const available = await checkUsername.mutateAsync(parsed.data.username);
        if (!available) {
          setError('Username taken. Try another.');
          return;
        }
        await createProfile.mutateAsync({
          id: session.user.id,
          username: parsed.data.username,
          display_name: parsed.data.displayName,
        });
        router.replace('/(app)/(tabs)');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    }

    const loading = checkUsername.isPending || createProfile.isPending;

    return (
      <ScreenContainer>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="flex-1 justify-center">
            <Text className="text-text-primary text-3xl font-light tracking-tight mb-2">
              Create your profile
            </Text>
            <Text className="text-text-secondary text-sm mb-8">
              How you'll show up to friends.
            </Text>
            <Input
              label="Username"
              value={username}
              onChangeText={(v) => setUsername(v.toLowerCase())}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
            />
            <Input
              label="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              autoComplete="name"
            />
            {error ? <Text className="text-red-500 text-sm mb-4">{error}</Text> : null}
            <Button label="Continue" onPress={onSubmit} loading={loading} />
          </View>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }
  ```

- [ ] **Step 9.2: Create `(app)/_layout.tsx` (the auth guard)**

  ```tsx
  import { useEffect } from 'react';
  import { Stack, router } from 'expo-router';
  import { ActivityIndicator, View } from 'react-native';

  import { useSession } from '@/lib/hooks/useSession';
  import { useMyProfile } from '@/lib/queries/profile';

  export default function AppLayout() {
    const { session, loading: sessionLoading } = useSession();
    const profileQ = useMyProfile(session?.user.id);

    useEffect(() => {
      if (sessionLoading) return;
      if (!session) {
        router.replace('/(auth)/welcome');
        return;
      }
      if (!profileQ.isLoading && !profileQ.data) {
        router.replace('/(auth)/profile-setup');
      }
    }, [session, sessionLoading, profileQ.isLoading, profileQ.data]);

    if (sessionLoading || profileQ.isLoading) {
      return (
        <View className="flex-1 items-center justify-center bg-bg-base">
          <ActivityIndicator />
        </View>
      );
    }

    return <Stack screenOptions={{ headerShown: false }} />;
  }
  ```

- [ ] **Step 9.3: Create tab layout**

  Create `app/(app)/(tabs)/_layout.tsx`:

  ```tsx
  import { Tabs } from 'expo-router';

  import { colors } from '@/theme';

  export default function TabsLayout() {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.bg.surface,
            borderTopColor: colors.border.subtle,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.text.secondary,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
        <Tabs.Screen name="start" options={{ title: '+ Round' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    );
  }
  ```

  Create the four tab placeholder screens (`index.tsx`, `discover.tsx`, `start.tsx`, `profile.tsx`) — each just renders a placeholder Text in a ScreenContainer for now. We'll fill them in in subsequent tasks.

  Example `(tabs)/index.tsx`:

  ```tsx
  import { Text } from 'react-native';
  import { ScreenContainer } from '@/components/ScreenContainer';

  export default function Feed() {
    return (
      <ScreenContainer>
        <Text className="text-text-primary text-3xl font-light mt-12">Home</Text>
        <Text className="text-text-secondary mt-2">Feed comes in Phase 3.</Text>
      </ScreenContainer>
    );
  }
  ```

  Repeat for `discover.tsx`, `start.tsx`, `profile.tsx` with appropriate titles.

- [ ] **Step 9.4: Test full auth flow on phone**

  - Reload Expo Go on iPhone → lands on Welcome
  - Tap "Get started" → sign-up form
  - Enter test email + password (8+ chars) → routes to profile setup
  - Enter username + display name → routes to tab bar
  - Force-quit Expo Go, reopen → lands directly on tab bar (session persisted)
  - Bottom tabs work, each shows placeholder text

- [ ] **Step 9.5: Commit**

  ```bash
  git add -A
  git commit -m "feat: add profile setup, auth-guarded app shell, tab bar"
  git push origin main
  ```

---

## Task 10: Course picker + add new course

**Files:** create `lib/queries/courses.ts`, `app/(app)/round/new/course.tsx`, `app/(app)/round/new/_layout.tsx`, components `CourseListItem.tsx`. Update `app/(app)/(tabs)/start.tsx` to navigate to the picker.

- [ ] **Step 10.1: Install location**

  ```bash
  npx expo install expo-location
  ```

  Add to `app.json` `expo.plugins`: `["expo-location", { "locationAlwaysAndWhenInUsePermission": "Golf App uses your location to find golf courses near you." }]` — careful to merge with existing plugins array, don't replace.

- [ ] **Step 10.2: Create `lib/queries/courses.ts`**

  ```ts
  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

  import { supabase, type Tables, type Inserts } from '@/lib/supabase';

  export function useCourseSearch(query: string) {
    return useQuery({
      queryKey: ['courses', 'search', query],
      queryFn: async () => {
        if (query.length < 2) return [];
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .ilike('name', `%${query}%`)
          .order('name')
          .limit(50);
        if (error) throw error;
        return (data ?? []) as Tables<'courses'>[];
      },
    });
  }

  export function useNearbyCourses(lat: number | null, lng: number | null) {
    return useQuery({
      queryKey: ['courses', 'nearby', lat, lng],
      queryFn: async () => {
        if (lat == null || lng == null) return [];
        // Bounding-box query: ~0.3deg ~= 20mi at mid-latitudes. Order client-side
        // by haversine for correctness; this is good enough as a first pass.
        const delta = 0.3;
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .gte('lat', lat - delta)
          .lte('lat', lat + delta)
          .gte('lng', lng - delta)
          .lte('lng', lng + delta)
          .limit(50);
        if (error) throw error;
        return (data ?? []) as Tables<'courses'>[];
      },
      enabled: lat != null && lng != null,
    });
  }

  export function useCreateCourse() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: Omit<Inserts<'courses'>, 'source' | 'added_by'>) => {
        const session = (await supabase.auth.getSession()).data.session;
        if (!session) throw new Error('Not authenticated');
        const { data, error } = await supabase
          .from('courses')
          .insert({
            ...input,
            source: 'user',
            added_by: session.user.id,
          })
          .select()
          .single();
        if (error) throw error;
        return data as Tables<'courses'>;
      },
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['courses'] });
      },
    });
  }
  ```

- [ ] **Step 10.3: Create `components/CourseListItem.tsx`**

  ```tsx
  import { Pressable, Text, View } from 'react-native';

  import type { Tables } from '@/lib/supabase';

  type Props = {
    course: Tables<'courses'>;
    onPress: () => void;
  };

  export function CourseListItem({ course, onPress }: Props) {
    const subtitle = [course.city, course.state].filter(Boolean).join(', ');
    return (
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3 py-3 border-b border-border-subtle active:opacity-60"
      >
        <View className="w-10 h-10 rounded-lg bg-bg-elevated items-center justify-center">
          <Text className="text-base">⛳</Text>
        </View>
        <View className="flex-1">
          <Text className="text-text-primary font-semibold text-sm">{course.name}</Text>
          <Text className="text-text-secondary text-xs">
            {subtitle || '—'} · {course.hole_count} holes
          </Text>
        </View>
      </Pressable>
    );
  }
  ```

- [ ] **Step 10.4: Create `app/(app)/round/new/_layout.tsx`**

  ```tsx
  import { Stack } from 'expo-router';

  export default function NewRoundLayout() {
    return <Stack screenOptions={{ headerShown: false }} />;
  }
  ```

- [ ] **Step 10.5: Create `app/(app)/round/new/course.tsx`**

  ```tsx
  import { useEffect, useState } from 'react';
  import { FlatList, Text, TextInput, View } from 'react-native';
  import { router } from 'expo-router';
  import * as Location from 'expo-location';

  import { ScreenContainer } from '@/components/ScreenContainer';
  import { CourseListItem } from '@/components/CourseListItem';
  import { useCourseSearch, useNearbyCourses } from '@/lib/queries/courses';

  export default function CoursePicker() {
    const [query, setQuery] = useState('');
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
      void (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      })();
    }, []);

    const search = useCourseSearch(query);
    const nearby = useNearbyCourses(coords?.lat ?? null, coords?.lng ?? null);

    const list = query.length >= 2 ? search.data : nearby.data;
    const sectionLabel = query.length >= 2 ? 'Search results' : 'Near you';

    return (
      <ScreenContainer>
        <Text className="text-text-primary text-3xl font-light mt-6 mb-4">Pick a course</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by course name…"
          placeholderTextColor="#4a5a52"
          className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-primary"
          autoCapitalize="none"
        />
        <Text className="text-text-secondary text-xs uppercase tracking-wider mt-6 mb-2">
          {sectionLabel}
        </Text>
        <FlatList
          data={list ?? []}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <CourseListItem
              course={item}
              onPress={() => router.push({ pathname: '/round/new/setup', params: { courseId: item.id } })}
            />
          )}
          ListEmptyComponent={
            <Text className="text-text-secondary text-sm mt-6">
              {query.length >= 2
                ? 'No courses match. Try adding it as a new course.'
                : coords
                  ? 'No courses found nearby.'
                  : 'Searching for nearby courses requires location permission.'}
            </Text>
          }
        />
        <View className="py-4">
          <Text
            className="text-accent text-center font-semibold py-3 border border-dashed border-border-subtle rounded-xl"
            onPress={() => router.push('/round/new/add-course')}
          >
            + Add a new course
          </Text>
        </View>
      </ScreenContainer>
    );
  }
  ```

- [ ] **Step 10.6: Create `app/(app)/round/new/add-course.tsx`** (the new course form)

  Implement a form with: name (required), city, state, country (default US), hole_count (default 18), optional GPS auto-fill button. On submit, call `useCreateCourse`, then `router.replace({ pathname: '/round/new/setup', params: { courseId: newCourseId } })`. Use `Input` component for fields. Validate via Zod schema.

- [ ] **Step 10.7: Update `(tabs)/start.tsx`**

  ```tsx
  import { useEffect } from 'react';
  import { router } from 'expo-router';

  export default function StartTab() {
    useEffect(() => {
      router.replace('/round/new/course');
    }, []);
    return null;
  }
  ```

- [ ] **Step 10.8: Verify**

  Reload on phone. Tap +Round tab → routes to course picker. Search returns empty (DB has no courses yet — expected). Tap "+ Add a new course" → form. Add a course (e.g., your local one). After save, lands on `/round/new/setup?courseId=...` (which is empty for now — Task 11).

- [ ] **Step 10.9: Commit**

  ```bash
  git add -A
  git commit -m "feat: add course picker, nearby courses, add-new-course form"
  git push origin main
  ```

---

## Task 11: Round setup + start scoring

**Files:** create `app/(app)/round/new/setup.tsx`, modify `lib/queries/rounds.ts`

- [ ] **Step 11.1: Create `lib/queries/rounds.ts`**

  ```ts
  import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

  import { supabase, type Tables, type Inserts, type Updates } from '@/lib/supabase';

  export function useCreateDraftRound() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: Inserts<'rounds'>) => {
        const { data, error } = await supabase
          .from('rounds')
          .insert({ ...input, is_draft: true })
          .select()
          .single();
        if (error) throw error;
        return data as Tables<'rounds'>;
      },
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['rounds'] });
      },
    });
  }

  export function useUserRounds(userId: string | undefined, includeDrafts = false) {
    return useQuery({
      queryKey: ['rounds', 'user', userId, includeDrafts],
      queryFn: async () => {
        if (!userId) return [];
        let q = supabase
          .from('rounds')
          .select('*, courses(name, city, state)')
          .eq('user_id', userId)
          .order('played_at', { ascending: false });
        if (!includeDrafts) q = q.eq('is_draft', false);
        const { data, error } = await q;
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!userId,
    });
  }

  export function useDraftRound(userId: string | undefined) {
    return useQuery({
      queryKey: ['rounds', 'draft', userId],
      queryFn: async () => {
        if (!userId) return null;
        const { data, error } = await supabase
          .from('rounds')
          .select('*')
          .eq('user_id', userId)
          .eq('is_draft', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return data as Tables<'rounds'> | null;
      },
      enabled: !!userId,
    });
  }

  export function useUpsertHoleScore() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: Inserts<'round_holes'>) => {
        const { data, error } = await supabase
          .from('round_holes')
          .upsert(input, { onConflict: 'round_id,hole_number' })
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      onSuccess: (_d, vars) => {
        void qc.invalidateQueries({ queryKey: ['round_holes', vars.round_id] });
      },
    });
  }

  export function useRoundHoles(roundId: string | undefined) {
    return useQuery({
      queryKey: ['round_holes', roundId],
      queryFn: async () => {
        if (!roundId) return [];
        const { data, error } = await supabase
          .from('round_holes')
          .select('*')
          .eq('round_id', roundId)
          .order('hole_number');
        if (error) throw error;
        return (data ?? []) as Tables<'round_holes'>[];
      },
      enabled: !!roundId,
    });
  }

  export function useFinalizeRound() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: { roundId: string; updates: Updates<'rounds'> }) => {
        const { data, error } = await supabase
          .from('rounds')
          .update({ ...input.updates, is_draft: false })
          .eq('id', input.roundId)
          .select()
          .single();
        if (error) throw error;
        return data as Tables<'rounds'>;
      },
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['rounds'] });
      },
    });
  }
  ```

- [ ] **Step 11.2: Create `app/(app)/round/new/setup.tsx`**

  - Read `courseId` from `useLocalSearchParams`.
  - Query the course for display.
  - Form: tee_box (default `'default'`), hole_count radio (9 / 18, default 18), played_at date (default today). Use simple TextInput for tee_box for now; date picker can be DateTimePicker if needed.
  - On submit: call `useCreateDraftRound` with `{ user_id, course_id, tee_box, played_at, total_score: 0, total_par: 0 }` then `router.replace({ pathname: '/round/new/score', params: { roundId, hole: '1' } })`.

  Full code:

  ```tsx
  import { useState } from 'react';
  import { Text, View } from 'react-native';
  import { router, useLocalSearchParams } from 'expo-router';

  import { Button } from '@/components/Button';
  import { ScreenContainer } from '@/components/ScreenContainer';
  import { useSession } from '@/lib/hooks/useSession';
  import { useCreateDraftRound } from '@/lib/queries/rounds';
  import { supabase } from '@/lib/supabase';
  import { useQuery } from '@tanstack/react-query';

  export default function RoundSetup() {
    const { courseId } = useLocalSearchParams<{ courseId: string }>();
    const { session } = useSession();
    const [holeCount, setHoleCount] = useState<9 | 18>(18);
    const createRound = useCreateDraftRound();

    const courseQ = useQuery({
      queryKey: ['course', courseId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId!)
          .single();
        if (error) throw error;
        return data;
      },
      enabled: !!courseId,
    });

    async function onStart() {
      if (!session || !courseId) return;
      const round = await createRound.mutateAsync({
        user_id: session.user.id,
        course_id: courseId,
        tee_box: 'default',
        total_score: 0,
        total_par: 0,
      });
      router.replace({ pathname: '/round/new/score', params: { roundId: round.id, hole: '1' } });
    }

    return (
      <ScreenContainer>
        <Text className="text-text-primary text-3xl font-light mt-6 mb-2">Round setup</Text>
        <Text className="text-text-secondary mb-6">{courseQ.data?.name ?? '...'}</Text>

        <Text className="text-text-secondary text-xs uppercase tracking-wider mb-2">Holes</Text>
        <View className="flex-row gap-3 mb-6">
          {[9, 18].map((n) => {
            const active = holeCount === n;
            return (
              <View
                key={n}
                onTouchEnd={() => setHoleCount(n as 9 | 18)}
                className={`flex-1 py-4 rounded-xl border items-center ${
                  active ? 'border-accent bg-accent-soft' : 'border-border-subtle'
                }`}
              >
                <Text className={`font-semibold ${active ? 'text-accent' : 'text-text-primary'}`}>
                  {n}
                </Text>
              </View>
            );
          })}
        </View>

        <View className="mt-auto pb-6">
          <Button
            label="Start scoring"
            onPress={onStart}
            loading={createRound.isPending}
            disabled={!courseId}
          />
        </View>
      </ScreenContainer>
    );
  }
  ```

- [ ] **Step 11.3: Verify on phone**

  Walk through: +Round tab → pick (or add) a course → setup → tap "Start scoring." Should route to `/round/new/score?roundId=X&hole=1` (which doesn't exist yet — expected).

- [ ] **Step 11.4: Commit**

  ```bash
  git add -A
  git commit -m "feat: add round setup screen and round queries"
  git push origin main
  ```

---

## Task 12: Hole-by-hole entry with autosave

**Files:** create `app/(app)/round/new/score.tsx`, components `ScoreStepper.tsx`, `HoleProgressBar.tsx`

This is the most user-facing piece. Spend time getting it right.

- [ ] **Step 12.1: Create `components/ScoreStepper.tsx`**

  ```tsx
  import { Pressable, Text, View } from 'react-native';

  import { colors } from '@/theme';

  type Props = {
    score: number;
    par: number;
    onChange: (next: number) => void;
  };

  export function ScoreStepper({ score, par, onChange }: Props) {
    const diff = score - par;
    const diffLabel =
      diff === 0
        ? 'Par'
        : diff < 0
          ? diff === -1
            ? 'Birdie (-1)'
            : diff === -2
              ? 'Eagle (-2)'
              : `${diff}`
          : diff === 1
            ? 'Bogey (+1)'
            : `+${diff}`;

    return (
      <View className="bg-bg-surface border border-border-subtle rounded-2xl py-5 px-4 items-center">
        <Text className="text-text-secondary text-xs uppercase tracking-wider mb-3">
          Your score
        </Text>
        <View className="flex-row items-center gap-6">
          <Pressable
            onPress={() => onChange(Math.max(1, score - 1))}
            className="w-10 h-10 rounded-full bg-border-subtle items-center justify-center"
            accessibilityLabel="Decrement score"
          >
            <Text className="text-text-primary text-xl">−</Text>
          </Pressable>
          <Text
            style={{ color: colors.accent }}
            className="text-6xl font-light tracking-tight"
          >
            {score}
          </Text>
          <Pressable
            onPress={() => onChange(Math.min(20, score + 1))}
            className="w-10 h-10 rounded-full bg-border-subtle items-center justify-center"
            accessibilityLabel="Increment score"
          >
            <Text className="text-accent text-xl">+</Text>
          </Pressable>
        </View>
        <Text className="text-text-secondary text-sm mt-2">{diffLabel}</Text>
      </View>
    );
  }
  ```

- [ ] **Step 12.2: Create `components/HoleProgressBar.tsx`**

  ```tsx
  import { Text, View } from 'react-native';

  import { colors } from '@/theme';

  type Props = {
    current: number;
    total: number;
    runningScore: number;
    runningDiff: number;
  };

  export function HoleProgressBar({ current, total, runningScore, runningDiff }: Props) {
    const pct = (current / total) * 100;
    return (
      <View>
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-text-secondary text-xs uppercase tracking-wider">
            Hole {current} of {total}
          </Text>
          <Text className="text-accent text-xs font-semibold">
            Total: {runningScore} ({runningDiff >= 0 ? `+${runningDiff}` : runningDiff})
          </Text>
        </View>
        <View className="h-1 bg-border-subtle rounded-full">
          <View
            style={{ width: `${pct}%`, backgroundColor: colors.accent }}
            className="h-1 rounded-full"
          />
        </View>
      </View>
    );
  }
  ```

- [ ] **Step 12.3: Create `app/(app)/round/new/score.tsx`**

  Implement:
  - Read `roundId` and `hole` from `useLocalSearchParams`.
  - Query the round, the course, course_holes (for par/yardage lookups), and round_holes (for what's already scored).
  - Determine current par: if course_holes has a row for this hole+tee, use it; else default to 4 and let user manually set.
  - Local state for current score, putts, fairway, gir, par (par is editable if course_holes doesn't have it yet).
  - On every score change: call `useUpsertHoleScore` to write to DB.
  - On par change (only if not in course_holes): also write the par into `course_holes` so future users benefit.
  - Swipe left/right (or buttons) to navigate to previous/next hole, updating the URL `hole` param.
  - When the user reaches the last hole and confirms score, route to `/round/new/summary?roundId=X`.

  This is a meaningful chunk of code — bias toward bite-sized commits during implementation. Skeleton:

  ```tsx
  import { useEffect, useMemo, useState } from 'react';
  import { Text, View, Pressable } from 'react-native';
  import { router, useLocalSearchParams } from 'expo-router';
  import { useQuery } from '@tanstack/react-query';

  import { ScreenContainer } from '@/components/ScreenContainer';
  import { ScoreStepper } from '@/components/ScoreStepper';
  import { HoleProgressBar } from '@/components/HoleProgressBar';
  import { supabase } from '@/lib/supabase';
  import { useUpsertHoleScore, useRoundHoles } from '@/lib/queries/rounds';

  export default function HoleEntry() {
    const { roundId, hole: holeParam } = useLocalSearchParams<{ roundId: string; hole: string }>();
    const hole = parseInt(holeParam ?? '1', 10);

    const roundQ = useQuery({
      queryKey: ['round', roundId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('rounds')
          .select('*, courses(name, hole_count)')
          .eq('id', roundId!)
          .single();
        if (error) throw error;
        return data;
      },
      enabled: !!roundId,
    });

    const courseHolesQ = useQuery({
      queryKey: ['course_holes', roundQ.data?.course_id, roundQ.data?.tee_box],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('course_holes')
          .select('*')
          .eq('course_id', roundQ.data!.course_id)
          .eq('tee_box', roundQ.data!.tee_box);
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!roundQ.data,
    });

    const roundHolesQ = useRoundHoles(roundId);
    const upsert = useUpsertHoleScore();

    const totalHoles = roundQ.data?.courses?.hole_count ?? 18;
    const courseHole = courseHolesQ.data?.find((h) => h.hole_number === hole);
    const existingHole = roundHolesQ.data?.find((h) => h.hole_number === hole);

    const [par, setPar] = useState(courseHole?.par ?? existingHole?.par ?? 4);
    const [score, setScore] = useState(existingHole?.score ?? courseHole?.par ?? 4);

    // Re-sync local state when navigating to a new hole
    useEffect(() => {
      const eh = roundHolesQ.data?.find((h) => h.hole_number === hole);
      const ch = courseHolesQ.data?.find((h) => h.hole_number === hole);
      const newPar = ch?.par ?? eh?.par ?? 4;
      setPar(newPar);
      setScore(eh?.score ?? newPar);
    }, [hole, roundHolesQ.data, courseHolesQ.data]);

    // Autosave on every score change
    useEffect(() => {
      if (!roundId) return;
      const t = setTimeout(() => {
        void upsert.mutate({
          round_id: roundId,
          hole_number: hole,
          score,
          par,
        });
      }, 250); // debounce so taps don't spam the network
      return () => clearTimeout(t);
    }, [score, par, hole, roundId]);

    const running = useMemo(() => {
      const scored = roundHolesQ.data ?? [];
      const sum = scored.reduce((a, h) => a + h.score, 0);
      const parSum = scored.reduce((a, h) => a + h.par, 0);
      return { score: sum, diff: sum - parSum };
    }, [roundHolesQ.data]);

    const isLast = hole >= totalHoles;

    return (
      <ScreenContainer>
        <View className="mt-4">
          <HoleProgressBar
            current={hole}
            total={totalHoles}
            runningScore={running.score}
            runningDiff={running.diff}
          />
        </View>
        <View className="items-center mt-8 mb-6">
          <Text className="text-6xl font-light text-text-primary">{hole}</Text>
          <Text className="text-text-secondary text-sm mt-1">
            Par {par}
            {courseHole?.yardage ? ` · ${courseHole.yardage} yd` : ''}
          </Text>
          {!courseHole ? (
            <View className="flex-row mt-2 gap-2">
              {[3, 4, 5].map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPar(p)}
                  className={`px-3 py-1 rounded-full border ${
                    par === p ? 'border-accent bg-accent-soft' : 'border-border-subtle'
                  }`}
                >
                  <Text className={par === p ? 'text-accent' : 'text-text-secondary'}>
                    Par {p}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        <ScoreStepper score={score} par={par} onChange={setScore} />
        <View className="flex-row justify-between mt-auto pb-6">
          <Pressable
            onPress={() => hole > 1 && router.setParams({ hole: String(hole - 1) })}
            disabled={hole === 1}
          >
            <Text className={hole === 1 ? 'text-text-muted' : 'text-text-secondary'}>
              ← Hole {hole - 1}
            </Text>
          </Pressable>
          {isLast ? (
            <Pressable onPress={() => router.replace({ pathname: '/round/new/summary', params: { roundId } })}>
              <Text className="text-accent font-semibold">Finish round →</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.setParams({ hole: String(hole + 1) })}>
              <Text className="text-accent font-semibold">Hole {hole + 1} →</Text>
            </Pressable>
          )}
        </View>
      </ScreenContainer>
    );
  }
  ```

- [ ] **Step 12.4: Verify on phone**

  Score a few holes. Each tap on +/− should write to the DB within ~250ms (debounced). Navigate away and back: scores persist. Force-quit Expo Go and reopen — the round still exists in DB.

- [ ] **Step 12.5: Commit**

  ```bash
  git add -A
  git commit -m "feat: hole-by-hole scoring with autosave + nav between holes"
  git push origin main
  ```

---

## Task 13: Round summary, save, and round detail

**Files:** create `app/(app)/round/new/summary.tsx`, `app/(app)/round/[id].tsx`, modify `app/(app)/(tabs)/profile.tsx`, components `RoundListItem.tsx`

- [ ] **Step 13.1: Create `app/(app)/round/new/summary.tsx`**

  Read `roundId`. Query round + round_holes. Compute total_score and total_par from round_holes. Show:
  - Course name + date
  - Big total score
  - vs par
  - 18-hole color-coded grid (use a horizontal grid of small squares, color by birdie+/par/bogey+)
  - Visibility toggle (private / mutuals — store choice locally)
  - "Save round" button → calls `useFinalizeRound` with `{ total_score, total_par, visibility }`, then `router.replace('/(app)/(tabs)/profile')`

- [ ] **Step 13.2: Create `components/RoundListItem.tsx`**

  Row layout: course name (or "Round at <course>"), date, big score, par diff, hole count.

- [ ] **Step 13.3: Update `app/(app)/(tabs)/profile.tsx`**

  Use `useSession` + `useUserRounds` + `useMyProfile`. Render header with display_name + username, then a FlatList of `RoundListItem` (tap → `/round/[id]`).

- [ ] **Step 13.4: Create `app/(app)/round/[id].tsx`**

  Read `id`. Query round + round_holes + course. Render the same layout as the summary screen but read-only (no save button, just back). Optional: delete button at bottom that calls a delete mutation.

- [ ] **Step 13.5: Verify end-to-end**

  Full flow on phone: + Round → pick course → setup → score 18 holes → summary → save → land on profile → see round there → tap → round detail.

- [ ] **Step 13.6: Commit**

  ```bash
  git add -A
  git commit -m "feat: round summary, save, profile round list, round detail"
  git push origin main
  ```

---

## Task 14: Resume mid-round + Settings + sign out

**Files:** modify `app/(app)/(tabs)/index.tsx` (add Resume banner), create `app/(app)/settings.tsx`

- [ ] **Step 14.1: Add Resume banner to home**

  In `(tabs)/index.tsx`, query `useDraftRound(session.user.id)`. If there's a draft round, render a card at the top: "Resume your round at <course name>?" with a "Continue scoring" button that routes to `/round/new/score?roundId=<draftId>&hole=<lastScored+1 or 1>`.

- [ ] **Step 14.2: Create `app/(app)/settings.tsx`**

  Show: signed-in email (from `session.user.email`), username (from profile), Sign Out button (calls `signOut`, redirects to `/(auth)/welcome`). Add a placeholder "Delete account" item that just shows an alert "Coming in Phase 4 (compliance)". Add a link to settings from the Profile tab (gear icon top-right).

- [ ] **Step 14.3: Verify**

  Score 5 holes, kill Expo Go, reopen — Home shows "Resume" banner, tap it, lands at hole 6 with prior 5 scores intact. Sign out from Settings, lands on Welcome screen.

- [ ] **Step 14.4: Commit**

  ```bash
  git add -A
  git commit -m "feat: resume-mid-round banner + settings screen + sign out"
  git push origin main
  ```

---

## Task 15: OSM course seed (deferred, optional for Phase 1 gate)

**Files:** create `scripts/seed-osm-courses.ts`, `supabase/seed/README.md`

This is a one-time script run from your laptop to bulk-import US courses. It writes via the Supabase service-role key (which we DO use here, but only locally — never bundled into the app). Run it once after Phase 1 is otherwise complete; you don't need it to pass the Phase 1 gate.

- [ ] **Step 15.1: Add USER ACTION to surface service-role key**

  In Supabase Dashboard → Settings → API → copy the **service_role** key (the long one labeled "service_role secret"). Add to `.env.local` as a NEW variable:

  ```
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
  ```

  Note: no `EXPO_PUBLIC_` prefix — this MUST NOT ship to the client. The script reads it from `process.env` at Node runtime, but Expo's bundler will refuse to inline anything not prefixed with `EXPO_PUBLIC_`, which is the safety we want.

  Update `.env.example` to document the new var (with placeholder).

- [ ] **Step 15.2: Write the seed script**

  Create `scripts/seed-osm-courses.ts` that:
  1. Queries Overpass API for `way["leisure"="golf_course"]` within US bounding boxes (split by state to stay under per-query size limits)
  2. For each result with a name + center coordinate, upserts into `courses` (matching on `(name, lat rounded, lng rounded)` to dedupe)
  3. Sets `source='osm'`, `verified=true` (since this is curated input)
  4. Throttles to ~1 query per 2 seconds (Overpass rate limit)
  5. Resumable: skip courses that already exist

  Sample skeleton — flesh out during implementation:

  ```ts
  import { createClient } from '@supabase/supabase-js';

  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // ... bounding boxes for US states ...
  // ... fetch from Overpass per box ...
  // ... upsert into courses ...
  ```

- [ ] **Step 15.3: Add npm script**

  `package.json` scripts:
  ```json
  "seed:osm": "tsx scripts/seed-osm-courses.ts"
  ```
  Install `tsx` as devDep so we can run TS directly.

- [ ] **Step 15.4: Run it**

  ```bash
  npm run seed:osm
  ```

  Expected: takes 20–60 minutes, ends with ~17k US courses in the `courses` table.

- [ ] **Step 15.5: Commit (script + README, NOT the seed data — that's in the DB)**

  ```bash
  git add scripts/ supabase/seed/README.md package.json .env.example
  git commit -m "feat(scripts): OSM course seed importer for US"
  git push origin main
  ```

---

## Phase 1 Verification Checklist

- [ ] **V1.1 — Sign up flow**
  Reload app on phone → Welcome → Get started → enter test email + password → routes to profile setup → enter username + display name → routes to home tab. **Pass:** profile created in DB; auth session persisted across app restart.

- [ ] **V1.2 — Sign in flow**
  Sign out, sign back in with same credentials → routes directly to home (no profile setup since profile exists).

- [ ] **V1.3 — Course picker**
  +Round tab → search field works → "+ Add a new course" → form submits → returns to setup screen with that course selected.

- [ ] **V1.4 — Score a full round**
  Setup → Start scoring → enter scores for all 18 holes (or 9, then ride out the rest) → Finish → Summary shows correct totals → Save → land on profile and see the saved round.

- [ ] **V1.5 — Mid-round resume**
  Start a new round, score 5 holes, force-quit Expo Go, reopen → Home shows "Resume your round" banner → tap → lands at hole 6 with prior 5 scores intact.

- [ ] **V1.6 — Privacy boundary**
  Sign out, sign up as a NEW user (test2@example.com), score a round → confirm test2 sees only their own round, NOT the first user's. **Pass:** RLS is doing its job.

- [ ] **V1.7 — Type/lint clean**
  `npm run typecheck && npm run lint` — both pass.

- [ ] **V1.8 — Tag the milestone**

  ```bash
  git tag -a phase-1 -m "Phase 1 complete: email auth + scoring"
  git push origin --tags
  ```

---

## Phase 1 Completion Criteria

Phase 1 is complete when ALL of the following are true:

1. ✅ Database has 5 tables with full RLS policies applied
2. ✅ Email signup, sign-in, sign-out, profile-setup all work end-to-end
3. ✅ User can pick a course, score 18 holes, save the round, see it on their profile
4. ✅ Mid-round draft autosave + resume works
5. ✅ User in account A cannot see rounds from account B (RLS verified)
6. ✅ `npm run typecheck` and `npm run lint` pass
7. ✅ Git tagged `phase-1`, pushed to GitHub
8. ✅ OSM course seed script exists (run is optional for the gate)

After Phase 1: write the Phase 2 plan (stats + profile polish — personal best, score trend chart, course detail screen).
