# Phase 4 — Compliance + Launch Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pass an App Store self-audit and be ready to ship a TestFlight build. Add account deletion, profanity filter, Privacy Manifest, ToS/Privacy/EULA links, Sentry, and re-enable email confirmation. By the end, the app has every piece Apple's reviewer is going to look for, and we can move to Phase 5 (TestFlight) without rework.

**Architecture:** Mostly additive. One Supabase Edge Function (`delete-account`) for the privileged auth admin call. Client-side validation for profanity at form submit, with a Postgres `CHECK` trigger as the server-side backstop. Sentry wires through the existing app root. Static legal pages live in the repo and get hosted on GitHub Pages.

**Tech Stack additions:**
- `bad-words` (npm) — profanity filter dictionary
- `@sentry/react-native` (Expo-compatible build) — error reporting

**Spec deviations:**
- **Contacts invite + Find Friends onboarding deferred to v2.** Original spec puts these in Phase 3. We pushed them out to ship faster — TestFlight feedback will tell us whether onboarding friction is real before we invest in the heavy hashed-contacts pipeline.
- **Skeletons / accessibility / performance polish deferred** until after TestFlight. Real-user feedback prioritizes better than guessing.
- **Apple Developer Program enrollment** — user action, not a code task. Must be done before Phase 5 (`developer.apple.com/programs`, $99/yr). Bundle ID `com.golfapp.app` is a placeholder; user picks a real one before submission.

**Working directory:** `/Users/gavingillespie/Desktop/Golf App/` — Phase 3b tagged `phase-3b`.

---

## File Structure

```
supabase/
├── functions/
│   └── delete-account/
│       ├── index.ts                # Edge Function: admin.deleteUser via service role
│       └── deno.json               # Deno config
└── migrations/
    └── 20260505000001_phase4_profanity_constraints.sql

lib/
├── profanity.ts                    # client-side wrapper around bad-words + custom seed list
└── sentry.ts                       # Sentry init wrapper

components/
└── ErrorBoundary.tsx               # top-level Sentry error boundary

app/
├── _layout.tsx                     # MODIFIED: wrap app in ErrorBoundary
└── (app)/
    └── settings.tsx                # MODIFIED: legal links, delete account button

docs/legal/
├── terms.md
├── privacy.md
└── eula.md

app.json                            # MODIFIED: privacy manifests + sentry plugin

.env.example                        # MODIFIED: add SENTRY_DSN
```

---

## Task 1: Profanity filter — client + DB

**Files:**
- Create: `lib/profanity.ts`
- Create: `supabase/migrations/20260505000001_phase4_profanity_constraints.sql`
- Modify: `app/(auth)/profile-setup.tsx` (or wherever username is chosen)
- Modify: `components/CommentInput.tsx`

The filter exists at two layers:
- **Client:** instant feedback at form submit. Uses the `bad-words` npm dictionary.
- **DB:** authoritative backstop via a Postgres function + table CHECK. We only check a small fixed list at the DB layer (a few high-severity slurs) — not because the DB needs to be the primary line of defense, but because RLS-bypassing inserts (e.g., from the Edge Function we add in Task 2) shouldn't be able to circumvent the check.

- [ ] **Step 1.1: Install `bad-words`**

  ```bash
  cd "/Users/gavingillespie/Desktop/Golf App"
  npm install bad-words --legacy-peer-deps
  ```

- [ ] **Step 1.2: Create `lib/profanity.ts`**

  ```ts
  import { Filter } from 'bad-words';

  // Single instance reused across calls.
  const filter = new Filter();

  // A few app-specific additions. Extend over time as needed.
  filter.addWords('test_blocked_word');

  /**
   * Returns true if the input contains profanity per the dictionary.
   * Conservative: matches whole words only.
   */
  export function containsProfanity(input: string): boolean {
    if (!input) return false;
    return filter.isProfane(input);
  }

  /**
   * Returns a user-friendly explanation of why an input is rejected,
   * or null if it's clean.
   */
  export function explainProfanity(input: string): string | null {
    return containsProfanity(input) ? 'That contains language not allowed here.' : null;
  }
  ```

- [ ] **Step 1.3: Create the migration**

  Create `supabase/migrations/20260505000001_phase4_profanity_constraints.sql`:

  ```sql
  -- ============================================================================
  -- Phase 4: server-side profanity backstop. The client filters with the full
  -- bad-words dictionary; the DB enforces a small high-severity list so even
  -- service-role inserts can't bypass it.
  -- ============================================================================

  -- A static seed of disallowed substrings. Lowercase, normalized.
  -- Keep this list short — it's a backstop, not the primary filter.
  CREATE OR REPLACE FUNCTION public.contains_blocked_word(input TEXT)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    IMMUTABLE
    AS $$
  DECLARE
    blocked TEXT[] := ARRAY[
      -- High-severity slurs — keep this list intentionally small.
      -- Real moderation happens client-side + via reports queue.
      'test_blocked_word'
    ];
    needle TEXT;
    haystack TEXT;
  BEGIN
    haystack := lower(input);
    FOREACH needle IN ARRAY blocked LOOP
      IF haystack ~* ('\m' || needle || '\M') THEN
        RETURN TRUE;
      END IF;
    END LOOP;
    RETURN FALSE;
  END;
  $$;

  -- profiles.username + profiles.display_name
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_username_no_blocked
      CHECK (NOT public.contains_blocked_word(username)),
    ADD CONSTRAINT profiles_display_name_no_blocked
      CHECK (NOT public.contains_blocked_word(display_name));

  -- comments.body
  ALTER TABLE comments
    ADD CONSTRAINT comments_body_no_blocked
      CHECK (NOT public.contains_blocked_word(body));
  ```

- [ ] **Step 1.4: Push migration + regenerate types**

  ```bash
  npm run db:push
  npm run db:types
  ```

- [ ] **Step 1.5: Wire into username form**

  Find the username form (it's in the auth flow — likely `app/(auth)/profile-setup.tsx`. Read it first to confirm path and shape).

  Where the form validates the username before calling `useCreateProfile`, add:

  ```tsx
  import { explainProfanity } from '@/lib/profanity';

  // ...inside the submit handler, before calling createProfile:
  const profanityError = explainProfanity(username) ?? explainProfanity(displayName);
  if (profanityError) {
    setError(profanityError); // or whatever local error mechanism the form uses
    return;
  }
  ```

  If the form lacks an error-display mechanism, add one — a `<Text className="text-red-500 text-xs mt-2">{error}</Text>` below the input is fine.

- [ ] **Step 1.6: Wire into `components/CommentInput.tsx`**

  Update the existing `onSend`:

  ```tsx
  import { Alert } from 'react-native';
  import { containsProfanity } from '@/lib/profanity';

  const onSend = () => {
    if (!canSend) return;
    if (containsProfanity(trimmed)) {
      Alert.alert('Comment rejected', 'That contains language not allowed here.');
      return;
    }
    post.mutate(
      { userId: viewerId, roundId, body: trimmed },
      {
        onSuccess: () => {
          setBody('');
          Keyboard.dismiss();
        },
      },
    );
  };
  ```

- [ ] **Step 1.7: Typecheck + lint + commit**

  ```bash
  npx tsc --noEmit && npm run lint
  git add lib/profanity.ts supabase/migrations/20260505000001_phase4_profanity_constraints.sql lib/database.types.ts components/CommentInput.tsx "app/(auth)/profile-setup.tsx" package.json package-lock.json
  git commit -m "feat(safety): client + DB profanity filter on usernames and comments"
  ```

---

## Task 2: Account deletion via Edge Function

**Files:**
- Create: `supabase/functions/delete-account/index.ts`
- Create: `supabase/functions/delete-account/deno.json`
- Modify: `app/(app)/settings.tsx`

Apple requires in-app account deletion (iOS 16+). Calling `auth.admin.deleteUser` requires the **service role key**, which must NEVER ship to the client. The standard pattern is a Supabase Edge Function that:
1. Reads the caller's JWT (Supabase auto-provides `req.headers.authorization`)
2. Verifies via `auth.getUser(jwt)` to extract the user's UUID
3. Calls `auth.admin.deleteUser(uuid)` using a service-role client

`profiles` has `ON DELETE CASCADE` to `auth.users`, and `rounds`/`round_holes`/`likes`/`comments`/`follows`/`blocks` cascade from `profiles`. So a single `auth.admin.deleteUser` cleans up everything.

- [ ] **Step 2.1: Create the function**

  Create `supabase/functions/delete-account/index.ts`:

  ```ts
  // deno-lint-ignore-file no-explicit-any
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, content-type',
        },
      });
    }
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const auth = req.headers.get('authorization');
    if (!auth) {
      return new Response(JSON.stringify({ error: 'missing authorization' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    const jwt = auth.replace(/^Bearer\s+/i, '');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the caller via their JWT.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    // Delete via service-role admin API. This cascades through profiles → rounds etc.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  });
  ```

  Create `supabase/functions/delete-account/deno.json`:

  ```json
  {
    "imports": {
      "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.45.0"
    }
  }
  ```

- [ ] **Step 2.2: Deploy the function**

  ```bash
  cd "/Users/gavingillespie/Desktop/Golf App"
  npx supabase functions deploy delete-account --no-verify-jwt
  ```

  > `--no-verify-jwt` lets us handle JWT verification ourselves inside the function (so we can return a clean 401 with our own JSON body). The function still validates the JWT via `auth.getUser`.

  After deploy, in the Supabase dashboard → Project Settings → Edge Functions → `delete-account` → Secrets, add:
  - `SUPABASE_URL` (the dashboard auto-populates this; verify it exists)
  - `SUPABASE_ANON_KEY` (auto-populated)
  - `SUPABASE_SERVICE_ROLE_KEY` (you must set manually; copy from Project Settings → API → service_role key)

  > The service role key has full DB access. Only the Edge Function should ever use it. Never ship it to the client.

- [ ] **Step 2.3: Wire the Settings UI**

  Read `app/(app)/settings.tsx` first. It already has Sign Out. Add a Delete Account section at the bottom.

  Imports:
  ```tsx
  import { Alert } from 'react-native';
  import { supabase } from '@/lib/supabase';
  ```

  Add a button + handler:
  ```tsx
  const onDelete = () => {
    Alert.alert(
      'Delete account?',
      'This permanently removes your profile, rounds, comments, and follows. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            const { data, error } = await supabase.functions.invoke('delete-account', {
              method: 'POST',
            });
            if (error) {
              Alert.alert('Could not delete', error.message);
              return;
            }
            await supabase.auth.signOut();
            // The auth listener will route us back to the sign-in screen.
          },
        },
      ],
    );
  };
  ```

  In the JSX, after the Sign Out button, add:
  ```tsx
  <Pressable onPress={onDelete} className="mt-6 active:opacity-70">
    <Text className="text-red-500 text-sm font-semibold">Delete account</Text>
  </Pressable>
  ```

- [ ] **Step 2.4: Typecheck + lint + commit**

  ```bash
  npx tsc --noEmit && npm run lint
  git add supabase/functions/delete-account "app/(app)/settings.tsx"
  git commit -m "feat(account): in-app account deletion via delete-account edge function"
  ```

---

## Task 3: Legal pages — ToS, Privacy, EULA

**Files:**
- Create: `docs/legal/terms.md`
- Create: `docs/legal/privacy.md`
- Create: `docs/legal/eula.md`
- Modify: `app/(app)/settings.tsx`

The App Store reviewer expects ToS and Privacy Policy URLs in the App Store listing AND linkable from the app. Apple's standard EULA is acceptable if you don't have a custom one (the app config can opt into it), but having our own EULA is cleaner. We host the markdown on GitHub Pages from the same repo.

> ⚠️ **Lawyer review before public launch.** The text below is a starting point, not legal advice. User should have these reviewed before Phase 6.

- [ ] **Step 3.1: Create `docs/legal/terms.md`**

  ```markdown
  # Terms of Service

  _Last updated: 2026-05-02_

  Welcome to Golf App ("we", "us"). By creating an account or using our app, you agree to these Terms.

  ## 1. Account
  You are responsible for the activity on your account. You must be at least 13 years old to use Golf App.

  ## 2. Acceptable use
  Don't post content that is illegal, harassing, defamatory, obscene, or that infringes someone else's rights. Don't try to break, scrape, or abuse the service.

  ## 3. Content
  You retain rights to content you post. You grant us a license to host and display it as needed to operate the service.

  ## 4. Termination
  We may suspend or terminate accounts that violate these Terms. You may delete your account at any time from in-app Settings.

  ## 5. Disclaimer
  The service is provided "as is." We don't guarantee accuracy of stats, courses, or scores. Use at your own risk.

  ## 6. Liability
  To the maximum extent permitted by law, our liability is limited to the amount you paid for the service (which is $0 unless you bought something).

  ## 7. Changes
  We may update these Terms. Continued use after changes means you accept the new Terms.

  ## 8. Contact
  Email gavin98gillespie@gmail.com with questions.
  ```

- [ ] **Step 3.2: Create `docs/legal/privacy.md`**

  ```markdown
  # Privacy Policy

  _Last updated: 2026-05-02_

  ## What we collect
  - **Account info:** email, username, display name, optional avatar.
  - **Round data:** scores, courses, dates you enter.
  - **Social graph:** follows, likes, comments, blocks, reports you create.
  - **Device info:** approximate location (only when you tap "near me" — never stored on our servers), crash reports via Sentry (no personally identifying data).

  ## What we do with it
  - Show you and your followers your rounds.
  - Power Discover and the feed.
  - Triage crashes and bugs.

  ## What we DON'T do
  - We don't sell your data.
  - We don't run ads.
  - We don't track you across other apps or websites.

  ## Third parties
  - **Supabase** (database + auth): hosts your account and content.
  - **Sentry** (crash reports): receives anonymized stack traces.
  - **OpenStreetMap** (course seed data): no personal data sent.

  ## Your choices
  - Set your profile to private or set rounds to private to limit visibility.
  - Block users to remove them from your view.
  - Delete your account from in-app Settings — this removes everything.

  ## Children
  Golf App is not directed at children under 13. We don't knowingly collect data from anyone under 13.

  ## Contact
  Email gavin98gillespie@gmail.com with privacy questions or to request a data export.
  ```

- [ ] **Step 3.3: Create `docs/legal/eula.md`**

  ```markdown
  # End User License Agreement (EULA)

  _Last updated: 2026-05-02_

  This EULA governs your use of the Golf App mobile application.

  ## License
  We grant you a limited, non-exclusive, non-transferable license to use the app on devices you own or control.

  ## Restrictions
  You may not reverse-engineer, decompile, or disassemble the app, or distribute copies of it.

  ## Intellectual property
  The app and its content (excluding user-generated content) are our property and protected by copyright.

  ## Termination
  This license terminates automatically if you breach these terms. Upon termination, you must stop using the app and delete it.

  ## No warranty
  The app is provided "as is" without warranty of any kind.

  ## Apple-specific terms
  If you obtained the app through Apple's App Store, the standard Apple Licensed Application End User License Agreement also applies (see `apple.com/legal/internet-services/itunes/dev/stdeula/`).

  ## Contact
  Email gavin98gillespie@gmail.com.
  ```

- [ ] **Step 3.4: Enable GitHub Pages**

  In a browser: GitHub repo `gavin98gillespie/golf-app` → Settings → Pages → Source: "Deploy from a branch", Branch: `main`, folder: `/docs`. Save.

  After GitHub publishes, the URLs will be:
  - https://gavin98gillespie.github.io/golf-app/legal/terms
  - https://gavin98gillespie.github.io/golf-app/legal/privacy
  - https://gavin98gillespie.github.io/golf-app/legal/eula

  > GitHub Pages serves `.md` rendered; `/docs/legal/terms.md` becomes `/legal/terms` (extension stripped).

- [ ] **Step 3.5: Add links to `app/(app)/settings.tsx`**

  Imports:
  ```tsx
  import * as WebBrowser from 'expo-web-browser';
  ```

  > If `expo-web-browser` isn't installed, add it: `npx expo install expo-web-browser`.

  Helper:
  ```tsx
  const openUrl = (url: string) => WebBrowser.openBrowserAsync(url);
  ```

  Render a Legal section (above Delete account):
  ```tsx
  <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-8 mb-2">Legal</Text>
  <Pressable
    onPress={() => openUrl('https://gavin98gillespie.github.io/golf-app/legal/terms')}
    className="py-3 active:opacity-70"
  >
    <Text className="text-text-primary text-sm">Terms of Service</Text>
  </Pressable>
  <Pressable
    onPress={() => openUrl('https://gavin98gillespie.github.io/golf-app/legal/privacy')}
    className="py-3 active:opacity-70"
  >
    <Text className="text-text-primary text-sm">Privacy Policy</Text>
  </Pressable>
  <Pressable
    onPress={() => openUrl('https://gavin98gillespie.github.io/golf-app/legal/eula')}
    className="py-3 active:opacity-70"
  >
    <Text className="text-text-primary text-sm">EULA</Text>
  </Pressable>
  ```

- [ ] **Step 3.6: Typecheck + lint + commit**

  ```bash
  npx tsc --noEmit && npm run lint
  git add docs/legal "app/(app)/settings.tsx" package.json package-lock.json
  git commit -m "feat(legal): ToS, Privacy, EULA pages + Settings links"
  ```

---

## Task 4: Privacy Manifest

**Files:**
- Modify: `app.json`

iOS 17+ requires a Privacy Manifest declaring required-reason API usage. Expo SDK 54 supports declaring this in `app.json` under `expo.ios.privacyManifests`.

- [ ] **Step 4.1: Inspect `app.json`**

  ```bash
  cat "/Users/gavingillespie/Desktop/Golf App/app.json"
  ```

  Find the `ios:` block.

- [ ] **Step 4.2: Add `privacyManifests`**

  Inside `expo.ios`, add:

  ```json
  "privacyManifests": {
    "NSPrivacyAccessedAPITypes": [
      {
        "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
        "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]
      },
      {
        "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryFileTimestamp",
        "NSPrivacyAccessedAPITypeReasons": ["C617.1"]
      },
      {
        "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategorySystemBootTime",
        "NSPrivacyAccessedAPITypeReasons": ["35F9.1"]
      },
      {
        "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryDiskSpace",
        "NSPrivacyAccessedAPITypeReasons": ["E174.1"]
      }
    ],
    "NSPrivacyTracking": false,
    "NSPrivacyTrackingDomains": [],
    "NSPrivacyCollectedDataTypes": [
      {
        "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeEmailAddress",
        "NSPrivacyCollectedDataTypeLinked": true,
        "NSPrivacyCollectedDataTypeTracking": false,
        "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]
      },
      {
        "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeUserID",
        "NSPrivacyCollectedDataTypeLinked": true,
        "NSPrivacyCollectedDataTypeTracking": false,
        "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]
      },
      {
        "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeName",
        "NSPrivacyCollectedDataTypeLinked": true,
        "NSPrivacyCollectedDataTypeTracking": false,
        "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]
      },
      {
        "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeCrashData",
        "NSPrivacyCollectedDataTypeLinked": false,
        "NSPrivacyCollectedDataTypeTracking": false,
        "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]
      }
    ]
  }
  ```

  The four "AccessedAPI" reasons cover Expo's typical native-module usage (UserDefaults via AsyncStorage, file timestamps, boot time, disk space). The "CollectedDataTypes" describe what we collect at the human level (email, UUID, name, crash data — all linked to the user, none used for tracking).

  Reason codes are from Apple's published list — `CA92.1` = "App functionality: store/access in-app preferences" and so on. Keep these unless you have evidence of additional API access.

- [ ] **Step 4.3: Validate the JSON**

  ```bash
  npx expo config --type prebuild > /dev/null
  ```

  This runs the Expo config resolver. If JSON is malformed it errors out. If output is silent (or just info-level lines), it's good.

- [ ] **Step 4.4: Commit**

  ```bash
  git add app.json
  git commit -m "feat(privacy): add ios privacy manifests for App Store"
  ```

---

## Task 5: Sentry crash reporting

**Files:**
- Create: `lib/sentry.ts`
- Create: `components/ErrorBoundary.tsx`
- Modify: `app/_layout.tsx`
- Modify: `app.json`
- Modify: `.env.example`

- [ ] **Step 5.1: Install Sentry**

  ```bash
  cd "/Users/gavingillespie/Desktop/Golf App"
  npx expo install @sentry/react-native
  ```

- [ ] **Step 5.2: Create a Sentry project**

  In a browser: sentry.io → create org if needed → create project → platform "React Native" → copy the DSN.

  Add to `.env.local` (gitignored):
  ```
  EXPO_PUBLIC_SENTRY_DSN=https://...@o....ingest.sentry.io/...
  ```

- [ ] **Step 5.3: Update `.env.example`**

  Append:
  ```
  # Sentry — get the DSN from sentry.io → your project → Settings → Client Keys (DSN)
  EXPO_PUBLIC_SENTRY_DSN=https://YOUR_DSN_HERE
  ```

- [ ] **Step 5.4: Create `lib/sentry.ts`**

  ```ts
  import * as Sentry from '@sentry/react-native';

  let initialized = false;

  export function initSentry() {
    if (initialized) return;
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    if (!dsn) {
      console.warn('Sentry DSN not configured; skipping init');
      return;
    }
    Sentry.init({
      dsn,
      enableAutoSessionTracking: true,
      // Set tracesSampleRate to 0 in dev; tune higher in production builds.
      tracesSampleRate: __DEV__ ? 0 : 0.2,
      // Don't send PII.
      sendDefaultPii: false,
    });
    initialized = true;
  }

  export const captureError = (err: unknown, context?: Record<string, unknown>) => {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  };
  ```

- [ ] **Step 5.5: Create `components/ErrorBoundary.tsx`**

  ```tsx
  import { Component, type PropsWithChildren, type ReactNode } from 'react';
  import { Pressable, Text, View } from 'react-native';

  import { captureError } from '@/lib/sentry';

  type State = { hasError: boolean };

  export class ErrorBoundary extends Component<PropsWithChildren, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
      return { hasError: true };
    }

    componentDidCatch(error: Error, info: { componentStack: string }) {
      captureError(error, { componentStack: info.componentStack });
    }

    reset = () => this.setState({ hasError: false });

    render(): ReactNode {
      if (this.state.hasError) {
        return (
          <View className="flex-1 bg-bg-base items-center justify-center px-6">
            <Text className="text-text-primary text-2xl font-light mb-2">Something broke.</Text>
            <Text className="text-text-secondary text-sm text-center mb-6">
              We've reported it. Try again, and if it keeps happening, restart the app.
            </Text>
            <Pressable
              onPress={this.reset}
              className="bg-accent rounded-full px-6 py-3 active:opacity-70"
            >
              <Text className="text-bg-base text-sm font-semibold">Try again</Text>
            </Pressable>
          </View>
        );
      }
      return this.props.children;
    }
  }
  ```

- [ ] **Step 5.6: Wire into `app/_layout.tsx`**

  Imports:
  ```tsx
  import { useEffect } from 'react';
  import { initSentry } from '@/lib/sentry';
  import { ErrorBoundary } from '@/components/ErrorBoundary';
  ```

  In the layout component:
  ```tsx
  useEffect(() => {
    initSentry();
  }, []);
  ```

  Wrap the existing tree (inside `<GestureHandlerRootView>`, outside `<QueryClientProvider>`) with `<ErrorBoundary>`.

- [ ] **Step 5.7: Add Sentry plugin to `app.json`**

  In `expo.plugins` array, add:
  ```json
  ["@sentry/react-native/expo", { "url": "https://sentry.io/" }]
  ```

  (Don't put the auth token in app.json — sourcemaps upload via env vars at build time, configured in EAS later.)

- [ ] **Step 5.8: Test it fires**

  In the Settings screen, add a temporary "Test crash" button (delete after Phase 4 verification):
  ```tsx
  <Pressable
    onPress={() => {
      throw new Error('Sentry test crash');
    }}
    className="mt-4 active:opacity-70"
  >
    <Text className="text-text-secondary text-xs">[dev] Trigger test error</Text>
  </Pressable>
  ```

  Run on device, tap it, verify the ErrorBoundary fallback renders. Check sentry.io → Issues for the captured event. Once verified, remove the button.

- [ ] **Step 5.9: Commit**

  ```bash
  git add lib/sentry.ts components/ErrorBoundary.tsx "app/_layout.tsx" app.json .env.example package.json package-lock.json
  git commit -m "feat(observability): add Sentry crash reporting + ErrorBoundary"
  ```

---

## Task 6: Re-enable email confirmation

**Files:** none (Supabase dashboard config) + verify the app handles the unconfirmed-state cleanly.

Phase 1 turned off email confirmation for development iteration. For TestFlight we re-enable it.

- [ ] **Step 6.1: Re-enable in Supabase dashboard**

  Browser: Supabase project → Authentication → Providers → Email → "Confirm email" → toggle ON. Save.

- [ ] **Step 6.2: Read the current sign-up flow**

  Read `app/(auth)/sign-up.tsx` (or whatever the sign-up file is). After `supabase.auth.signUp`, the user's session may be null (because confirmation pending).

- [ ] **Step 6.3: Handle the pending-confirmation state**

  After successful signup, if `data.session === null && data.user`, show:
  ```tsx
  Alert.alert(
    'Check your email',
    'We sent you a confirmation link. Tap it to finish creating your account, then come back and sign in.',
    [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }],
  );
  ```

  Or render an inline "Check your email" screen — whichever fits the existing auth UI better. Don't try to log them in or push past the auth gate without a session.

- [ ] **Step 6.4: Phone test**

  Sign up with a fresh email. Verify:
  - "Check your email" message shows.
  - The confirmation email arrives (check spam).
  - Tapping the link opens the URL (defaults to `localhost` for dev — that's fine for Expo Go testing; for production set the redirect URL in Supabase Auth settings to a deep link).
  - After confirming, sign in works normally.

- [ ] **Step 6.5: Commit any code changes**

  ```bash
  git add "app/(auth)/sign-up.tsx"
  git commit -m "feat(auth): handle email-confirmation-pending state on signup"
  ```

---

## Task 7: Phone test + tag

- [ ] **Step 7.1: Run through the App Store self-audit**

  Verify on the phone, fresh app install:
  - [ ] Sign up requires email confirmation; "Check your email" message shown.
  - [ ] Sign in works after confirmation.
  - [ ] Settings has Terms / Privacy / EULA — all open in browser.
  - [ ] Settings has "Delete account" — full path: confirm → "Delete forever" → success → signed out → fresh state.
  - [ ] Verifying in Supabase: deleted user is gone from `auth.users` AND `profiles`/`rounds`/etc.
  - [ ] Trying to set a username with a blocked word (use `test_blocked_word`) is rejected client-side.
  - [ ] Trying to post a comment with the blocked word is rejected client-side.
  - [ ] (Dev only) Sentry captures a forced error and shows up in sentry.io.

- [ ] **Step 7.2: Tag**

  ```bash
  cd "/Users/gavingillespie/Desktop/Golf App"
  git tag -a phase-4 -m "Phase 4: compliance + launch prep (account deletion, profanity filter, legal, privacy manifests, Sentry)"
  git push origin main --tags
  ```

---

## Verification matrix

| Concern | Enforced by |
|---|---|
| Account deletion is irreversible and complete | `auth.admin.deleteUser` cascades through all FKs |
| Service-role key never reaches client | Edge Function holds it; client only sends JWT |
| Caller of delete-account is who they claim to be | Edge Function calls `auth.getUser(jwt)` to verify |
| Profanity filter can't be bypassed via Edge Function inserts | DB CHECK constraints on `profiles` and `comments` |
| Crashes don't take down the whole app | Top-level `<ErrorBoundary>` catches React render errors and reports to Sentry |
| Email confirmation enforced | Supabase config + UI handles pending state without leaking access |
| ToS / Privacy / EULA reachable from app | Settings → WebBrowser opens GitHub-Pages-hosted markdown |
| Privacy Manifest declares all required-reason API uses | `app.json` `expo.ios.privacyManifests` |

## Spec-vs-plan deltas

- **Contacts invite + Find Friends step deferred to v2.** Reason: launch faster; learn from TestFlight before investing in the heavy hashed-contacts pipeline.
- **Skeletons / accessibility / performance polish deferred** until after TestFlight feedback.
- **Apple Developer Program enrollment is a user action**, not a code task. Required before Phase 5.
- **Bundle ID `com.golfapp.app`** is still a placeholder; user must replace before App Store submission.
- **Lawyer review of legal pages is the user's responsibility** before public launch (not before TestFlight).
