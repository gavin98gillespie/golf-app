# Phase 0 — Project Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the React Native + Expo project with TypeScript, Expo Router, NativeWind, Inter font, and the approved dark-sporty design system. End state: the user scans a QR code in Expo Go on their iPhone and sees a "Hello, Golf" welcome screen rendered in the agreed-upon visual style. Plus all third-party accounts created and ready for Phase 1.

**Architecture:** Single Expo project (no monorepo). Expo Router for file-based navigation. NativeWind 4 for Tailwind-style styling. Theme tokens defined in TypeScript (`theme/colors.ts`, `theme/typography.ts`) and consumed by Tailwind config. No backend integration in Phase 0 — Supabase work begins Phase 1.

**Tech Stack:** Expo SDK (latest stable), TypeScript (strict mode), Expo Router, NativeWind 4, Inter (via `@expo-google-fonts/inter`), ESLint + Prettier, EAS Build.

**Working directory:** `/Users/gavingillespie/Desktop/Golf App/` (currently empty — Expo project will be initialized here).

---

## File Structure (Phase 0)

```
Golf App/
├── app/
│   └── index.tsx              # Welcome screen — "Hello, Golf"
├── theme/
│   ├── colors.ts              # Approved palette as TS const
│   └── typography.ts          # Inter weights + size scale
├── assets/
│   ├── icon.png               # App icon (1024x1024)
│   ├── splash.png             # Splash screen
│   └── adaptive-icon.png      # Android adaptive icon (for future)
├── docs/
│   └── superpowers/
│       ├── specs/             # (already has the design doc)
│       └── plans/             # (this file lives here)
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── app.config.ts              # Expo config (icon, splash, plugins, Info.plist purpose strings)
├── babel.config.js            # NativeWind babel plugin
├── eas.json                   # EAS Build profiles
├── global.css                 # NativeWind directives
├── metro.config.js            # NativeWind metro plugin
├── package.json
├── README.md
├── tailwind.config.js         # Theme tokens consumed here
└── tsconfig.json              # Strict mode on
```

---

## Task 0: USER ACTION ITEMS (must complete before Task 9)

**Files:** none (external accounts)

These are the items only the user can do. Some have lead time (Apple Developer verification can take 24–48h). The user should kick these off immediately — most can be done in parallel with the engineering tasks below.

- [ ] **Step 0.1: Enroll in Apple Developer Program ($99/yr)**

  Go to https://developer.apple.com/programs/enroll/ and sign in with the personal Apple ID you want to publish under. Choose "Individual" enrollment (you can switch to a company entity later). Verification can take 24–48 hours. **Start this on day 1.**

- [ ] **Step 0.2: Create Expo / EAS account**

  Go to https://expo.dev/signup. Free tier is fine for development. Save the username — Claude will need it during `eas init`.

- [ ] **Step 0.3: Create Supabase account**

  Go to https://supabase.com/dashboard/sign-up. Free tier is fine for development. We'll create the actual project in Phase 1.

- [ ] **Step 0.4: Create Sentry account**

  Go to https://sentry.io/signup/. Free tier (5k events/month) is fine for now. We'll wire it up in Phase 4.

- [ ] **Step 0.5: Create PostHog account**

  Go to https://us.posthog.com/signup. Free tier is generous (1M events/month). We'll wire it up in Phase 4.

- [ ] **Step 0.6: Install Expo Go on your iPhone**

  Open the App Store on your iPhone, search for "Expo Go," install it. Sign in with the Expo account from Step 0.2.

- [ ] **Step 0.7: Confirm Node.js 20+ is installed on your Mac**

  Open Terminal and run `node --version`. Expected: `v20.x.x` or higher. If not installed or older, install from https://nodejs.org (LTS version).

- [ ] **Step 0.8: Decide on the working app name**

  "Golf App" is the working title; pick something better before App Store submission. For Phase 0 we'll use a placeholder ("Golf App") that's easy to find-and-replace later. You don't need to decide now.

---

## Task 1: Initialize Expo project

**Files:**
- Create: `package.json`, `app.json`, `App.tsx`, `tsconfig.json` (all generated)
- Create: `.gitignore` (generated)

- [ ] **Step 1.1: Confirm working directory is empty**

  Run: `ls -la "/Users/gavingillespie/Desktop/Golf App"`

  Expected: only `.` and `..` (and possibly `.superpowers/` from brainstorming, `docs/` we just made). No other files.

- [ ] **Step 1.2: Initialize Expo project with TypeScript template**

  Run from `/Users/gavingillespie/Desktop/Golf App/`:

  ```bash
  npx create-expo-app@latest . --template blank-typescript
  ```

  When prompted "The directory is not empty. Continue?", say **yes** (we have `docs/` and `.superpowers/`, which are safe). The CLI will install deps automatically.

  Expected: takes 1–2 minutes, ends with "Your project is ready!"

- [ ] **Step 1.3: Verify project boots**

  Run: `npx expo start --no-dev-client`

  Expected: Metro bundler starts, prints a QR code. Press `q` to quit.

- [ ] **Step 1.4: Initial commit**

  ```bash
  git init
  git add -A
  git commit -m "chore: initialize Expo + TypeScript project"
  ```

  Expected: a single initial commit with all generated files.

---

## Task 2: Enable TypeScript strict mode

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 2.1: Update tsconfig.json**

  Replace the existing `tsconfig.json` content with:

  ```json
  {
    "extends": "expo/tsconfig.base",
    "compilerOptions": {
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "noImplicitOverride": true,
      "exactOptionalPropertyTypes": true,
      "paths": {
        "@/*": ["./*"]
      }
    },
    "include": [
      "**/*.ts",
      "**/*.tsx",
      ".expo/types/**/*.ts",
      "expo-env.d.ts"
    ]
  }
  ```

- [ ] **Step 2.2: Verify TypeScript compiles cleanly**

  Run: `npx tsc --noEmit`

  Expected: no output (success). If there are errors in the boilerplate `App.tsx`, that's fine — we'll replace it in Task 7. If errors appear elsewhere, fix them before moving on.

- [ ] **Step 2.3: Commit**

  ```bash
  git add tsconfig.json
  git commit -m "chore: enable TypeScript strict mode + path aliases"
  ```

---

## Task 3: Install Expo Router

**Files:**
- Modify: `package.json` (auto), `app.json`, `App.tsx` (will be deleted in Task 7)
- Create: `app/_layout.tsx`, `app/index.tsx`

- [ ] **Step 3.1: Install Expo Router and dependencies**

  ```bash
  npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
  ```

  Expected: success message, deps added to `package.json`.

- [ ] **Step 3.2: Update package.json `main` entry**

  In `package.json`, replace:

  ```json
  "main": "node_modules/expo/AppEntry.js"
  ```

  with:

  ```json
  "main": "expo-router/entry"
  ```

- [ ] **Step 3.3: Add Expo Router scheme to app.json**

  In `app.json`, inside the `"expo"` object, add:

  ```json
  "scheme": "golfapp",
  "plugins": ["expo-router"]
  ```

- [ ] **Step 3.4: Create root layout**

  Create file `app/_layout.tsx`:

  ```tsx
  import { Stack } from 'expo-router';
  import { StatusBar } from 'expo-status-bar';

  export default function RootLayout() {
    return (
      <>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </>
    );
  }
  ```

- [ ] **Step 3.5: Create placeholder index route**

  Create file `app/index.tsx`:

  ```tsx
  import { Text, View } from 'react-native';

  export default function Index() {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Hello, Golf</Text>
      </View>
    );
  }
  ```

- [ ] **Step 3.6: Delete App.tsx (no longer used by Expo Router)**

  ```bash
  rm App.tsx
  ```

- [ ] **Step 3.7: Verify boot**

  Run: `npx expo start`

  Expected: Metro starts. Press `i` to open iOS simulator (or scan QR on iPhone). Should see "Hello, Golf" centered on a white screen. Press `q` to quit.

  *If iOS simulator isn't installed:* skip the `i` step; just confirm Metro starts cleanly. We'll test on the iPhone in Task 9.

- [ ] **Step 3.8: Commit**

  ```bash
  git add -A
  git commit -m "chore: add Expo Router with placeholder Hello, Golf screen"
  ```

---

## Task 4: Install + configure NativeWind 4

**Files:**
- Modify: `package.json`, `babel.config.js`, `metro.config.js`, `tsconfig.json`
- Create: `global.css`, `nativewind-env.d.ts`, `tailwind.config.js`

- [ ] **Step 4.1: Install NativeWind 4 and Tailwind**

  ```bash
  npx expo install nativewind tailwindcss@^3.4.17 react-native-reanimated react-native-safe-area-context
  ```

- [ ] **Step 4.2: Generate Tailwind config**

  ```bash
  npx tailwindcss init
  ```

  This creates `tailwind.config.js`.

- [ ] **Step 4.3: Replace tailwind.config.js**

  Replace the contents of `tailwind.config.js` with:

  ```js
  /** @type {import('tailwindcss').Config} */
  module.exports = {
    content: [
      './app/**/*.{js,jsx,ts,tsx}',
      './components/**/*.{js,jsx,ts,tsx}',
    ],
    presets: [require('nativewind/preset')],
    theme: {
      extend: {
        colors: {
          // Approved palette
          'bg-base': '#08100c',
          'bg-surface': '#0f1814',
          'bg-elevated': '#0a120e',
          'border-subtle': '#1c2a23',
          'text-primary': '#f0efe8',
          'text-secondary': '#7a8a82',
          'text-muted': '#4a5a52',
          'accent': '#4ade80',
          'accent-soft': 'rgba(74, 222, 128, 0.06)',
        },
        fontFamily: {
          sans: ['Inter_400Regular'],
          medium: ['Inter_500Medium'],
          semibold: ['Inter_600SemiBold'],
          bold: ['Inter_700Bold'],
          light: ['Inter_300Light'],
        },
      },
    },
    plugins: [],
  };
  ```

- [ ] **Step 4.4: Create global.css**

  Create file `global.css`:

  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```

- [ ] **Step 4.5: Update babel.config.js**

  Replace `babel.config.js` contents:

  ```js
  module.exports = function (api) {
    api.cache(true);
    return {
      presets: [
        ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
        'nativewind/babel',
      ],
    };
  };
  ```

- [ ] **Step 4.6: Create metro.config.js**

  Create file `metro.config.js`:

  ```js
  const { getDefaultConfig } = require('expo/metro-config');
  const { withNativeWind } = require('nativewind/metro');

  const config = getDefaultConfig(__dirname);

  module.exports = withNativeWind(config, { input: './global.css' });
  ```

- [ ] **Step 4.7: Create nativewind-env.d.ts**

  Create file `nativewind-env.d.ts`:

  ```ts
  /// <reference types="nativewind/types" />
  ```

- [ ] **Step 4.8: Add nativewind-env.d.ts to tsconfig include**

  In `tsconfig.json`, ensure the `"include"` array contains `"nativewind-env.d.ts"`:

  ```json
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts",
    "nativewind-env.d.ts"
  ]
  ```

- [ ] **Step 4.9: Update root layout to import global.css**

  Modify `app/_layout.tsx` — add the import as the very first line:

  ```tsx
  import '../global.css';

  import { Stack } from 'expo-router';
  import { StatusBar } from 'expo-status-bar';

  export default function RootLayout() {
    return (
      <>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </>
    );
  }
  ```

- [ ] **Step 4.10: Test NativeWind class resolution**

  Modify `app/index.tsx`:

  ```tsx
  import { Text, View } from 'react-native';

  export default function Index() {
    return (
      <View className="flex-1 items-center justify-center bg-bg-base">
        <Text className="text-text-primary text-2xl">Hello, Golf</Text>
      </View>
    );
  }
  ```

- [ ] **Step 4.11: Verify NativeWind works**

  Run: `npx expo start --clear`

  Press `i` (or scan with iPhone). Expected: dark background (`#08100c`) with cream text "Hello, Golf" centered. If the screen is white, NativeWind isn't applying — check babel/metro config.

- [ ] **Step 4.12: Commit**

  ```bash
  git add -A
  git commit -m "chore: add NativeWind 4 with approved color palette"
  ```

---

## Task 5: Install Inter font

**Files:**
- Modify: `app/_layout.tsx`
- Create: `theme/typography.ts`

- [ ] **Step 5.1: Install Inter font package**

  ```bash
  npx expo install @expo-google-fonts/inter expo-font expo-splash-screen
  ```

- [ ] **Step 5.2: Create theme/typography.ts**

  Create file `theme/typography.ts`:

  ```ts
  export const FONT_WEIGHTS = ['Inter_300Light', 'Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold', 'Inter_700Bold'] as const;

  export type FontWeight = typeof FONT_WEIGHTS[number];
  ```

- [ ] **Step 5.3: Wire font loading in root layout**

  Replace `app/_layout.tsx`:

  ```tsx
  import '../global.css';

  import { useEffect } from 'react';
  import { Stack } from 'expo-router';
  import { StatusBar } from 'expo-status-bar';
  import * as SplashScreen from 'expo-splash-screen';
  import {
    useFonts,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  } from '@expo-google-fonts/inter';

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
      <>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </>
    );
  }
  ```

- [ ] **Step 5.4: Test that Inter renders**

  Modify `app/index.tsx`:

  ```tsx
  import { Text, View } from 'react-native';

  export default function Index() {
    return (
      <View className="flex-1 items-center justify-center bg-bg-base">
        <Text className="text-text-primary text-5xl font-light tracking-tight">
          Hello, Golf
        </Text>
        <Text className="text-text-secondary text-sm mt-2 tracking-wider uppercase">
          Phase 0 · Setup
        </Text>
      </View>
    );
  }
  ```

- [ ] **Step 5.5: Verify on simulator/device**

  Run: `npx expo start --clear`

  Expected: "Hello, Golf" renders in Inter Light (thin), large size, with "Phase 0 · Setup" in small uppercase secondary text below. The font is visibly different from the default system font.

- [ ] **Step 5.6: Commit**

  ```bash
  git add -A
  git commit -m "feat: load Inter font with approved weights"
  ```

---

## Task 6: Create design-token modules

**Files:**
- Create: `theme/colors.ts`
- Create: `theme/index.ts`

- [ ] **Step 6.1: Create theme/colors.ts**

  Create file `theme/colors.ts`:

  ```ts
  export const colors = {
    bg: {
      base: '#08100c',
      surface: '#0f1814',
      elevated: '#0a120e',
    },
    border: {
      subtle: '#1c2a23',
    },
    text: {
      primary: '#f0efe8',
      secondary: '#7a8a82',
      muted: '#4a5a52',
    },
    accent: '#4ade80',
    accentSoft: 'rgba(74, 222, 128, 0.06)',
    accentBorder: 'rgba(74, 222, 128, 0.4)',
  } as const;

  export type Colors = typeof colors;
  ```

- [ ] **Step 6.2: Create theme/index.ts (barrel export)**

  Create file `theme/index.ts`:

  ```ts
  export * from './colors';
  export * from './typography';
  ```

- [ ] **Step 6.3: Verify imports work**

  Modify `app/index.tsx` to use the theme module:

  ```tsx
  import { Text, View } from 'react-native';
  import { colors } from '@/theme';

  export default function Index() {
    return (
      <View className="flex-1 items-center justify-center bg-bg-base">
        <Text className="text-text-primary text-5xl font-light tracking-tight">
          Hello, Golf
        </Text>
        <Text className="text-text-secondary text-sm mt-2 tracking-wider uppercase">
          Phase 0 · Setup
        </Text>
        <View
          className="mt-6 px-3 py-1 rounded-full"
          style={{ backgroundColor: colors.accentSoft, borderColor: colors.accent, borderWidth: 1 }}
        >
          <Text className="text-xs" style={{ color: colors.accent }}>
            v0.0.1
          </Text>
        </View>
      </View>
    );
  }
  ```

  Expected: TypeScript autocomplete works on `colors.` and the badge renders with green outline + soft green fill.

- [ ] **Step 6.4: Verify on simulator/device**

  Run: `npx expo start --clear`. Confirm the small green "v0.0.1" badge appears below the subtitle.

- [ ] **Step 6.5: Commit**

  ```bash
  git add -A
  git commit -m "feat: add theme module with typed color tokens"
  ```

---

## Task 7: App icon + splash screen (placeholder)

**Files:**
- Create: `assets/icon.png` (1024x1024 placeholder)
- Create: `assets/splash.png` (1284x2778 placeholder)
- Modify: `app.json`

These are placeholders. Real designed icons come at the end of Phase 4 before TestFlight.

- [ ] **Step 7.1: Generate placeholder icon**

  We'll use `sips` (built into macOS) to generate a solid-color 1024x1024 PNG with a green dot, suitable as a placeholder. Run:

  ```bash
  cd "/Users/gavingillespie/Desktop/Golf App"
  mkdir -p assets

  # Create a 1024x1024 dark green PNG via Python (or use a real designed icon)
  python3 -c "
  from PIL import Image, ImageDraw
  img = Image.new('RGB', (1024, 1024), '#08100c')
  draw = ImageDraw.Draw(img)
  draw.ellipse((362, 362, 662, 662), fill='#4ade80')
  img.save('assets/icon.png')
  "
  ```

  *If `Pillow` is not installed:* run `python3 -m pip install Pillow` first.

  *If Python isn't available:* Skip to Step 7.4 — Expo will use its default icon and we'll add a designed one in Phase 4.

- [ ] **Step 7.2: Generate placeholder splash**

  ```bash
  python3 -c "
  from PIL import Image, ImageDraw
  img = Image.new('RGB', (1284, 2778), '#08100c')
  draw = ImageDraw.Draw(img)
  cx, cy = 642, 1389
  draw.ellipse((cx-150, cy-150, cx+150, cy+150), fill='#4ade80')
  img.save('assets/splash.png')
  "
  ```

- [ ] **Step 7.3: Verify files exist**

  ```bash
  ls -lh assets/
  ```

  Expected: `icon.png` (~10–50KB) and `splash.png` (~30–100KB).

- [ ] **Step 7.4: Update app.json**

  Replace the `expo` block in `app.json` to include icon, splash, plugins, and iOS config:

  ```json
  {
    "expo": {
      "name": "Golf App",
      "slug": "golf-app",
      "version": "0.0.1",
      "orientation": "portrait",
      "icon": "./assets/icon.png",
      "userInterfaceStyle": "dark",
      "scheme": "golfapp",
      "splash": {
        "image": "./assets/splash.png",
        "resizeMode": "contain",
        "backgroundColor": "#08100c"
      },
      "ios": {
        "supportsTablet": false,
        "bundleIdentifier": "com.golfapp.app",
        "infoPlist": {
          "ITSAppUsesNonExemptEncryption": false,
          "NSLocationWhenInUseUsageDescription": "Golf App uses your location to find golf courses near you.",
          "NSContactsUsageDescription": "Golf App uses your contacts to help you find friends to follow."
        }
      },
      "plugins": [
        "expo-router",
        "expo-font"
      ]
    }
  }
  ```

  *Note on `bundleIdentifier`:* `com.golfapp.app` is a placeholder. The user must change this to a unique reverse-domain identifier they own (e.g., `com.<yourlastname>.golfapp`) before Phase 6 (App Store submission). Apple requires it to be globally unique.

- [ ] **Step 7.5: Verify Expo loads the new config**

  Run: `npx expo start --clear`. Expected: Metro logs the new app name "Golf App" (not the boilerplate name).

- [ ] **Step 7.6: Commit**

  ```bash
  git add -A
  git commit -m "feat: add placeholder app icon, splash, and Info.plist purpose strings"
  ```

---

## Task 8: ESLint + Prettier

**Files:**
- Create: `.prettierrc`, `.eslintrc.js`
- Modify: `package.json` (add scripts)

- [ ] **Step 8.1: Install ESLint + Prettier**

  ```bash
  npx expo install eslint eslint-config-expo prettier eslint-plugin-prettier eslint-config-prettier --dev
  ```

- [ ] **Step 8.2: Create .eslintrc.js**

  Create file `.eslintrc.js`:

  ```js
  module.exports = {
    extends: ['expo', 'prettier'],
    plugins: ['prettier'],
    rules: {
      'prettier/prettier': 'warn',
    },
    ignorePatterns: ['node_modules', '.expo', 'dist'],
  };
  ```

- [ ] **Step 8.3: Create .prettierrc**

  Create file `.prettierrc`:

  ```json
  {
    "semi": true,
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2
  }
  ```

- [ ] **Step 8.4: Add lint and format scripts to package.json**

  In `package.json`, add to the `"scripts"` object:

  ```json
  "lint": "eslint .",
  "format": "prettier --write \"**/*.{ts,tsx,js,json,md}\"",
  "typecheck": "tsc --noEmit"
  ```

- [ ] **Step 8.5: Run all three checks**

  ```bash
  npm run typecheck
  npm run lint
  npm run format
  ```

  Expected: typecheck passes, lint shows no errors (warnings about prettier are OK and were just fixed by format), format reformats all files in place.

- [ ] **Step 8.6: Commit**

  ```bash
  git add -A
  git commit -m "chore: add ESLint + Prettier with project conventions"
  ```

---

## Task 9: Test on user's iPhone via Expo Go

**Files:** none

This is the moment of truth — the user holds their phone and sees Phase 0's deliverable.

- [ ] **Step 9.1: Verify Expo Go is installed on user's iPhone (User Step 0.6)**

  Confirmed: User has Expo Go installed and is signed into their Expo account.

- [ ] **Step 9.2: Confirm Mac and iPhone are on same Wi-Fi network**

  Both devices must be on the same network (or use tunnel mode). If on different networks, run `npx expo start --tunnel` instead in the next step.

- [ ] **Step 9.3: Start Expo dev server**

  ```bash
  npx expo start
  ```

  Expected: Metro bundler starts, terminal shows a QR code and a URL like `exp://192.168.x.x:8081`.

- [ ] **Step 9.4: User opens Camera app on iPhone, scans QR code**

  The Camera app will detect the QR and offer to open it in Expo Go. Tap the notification.

- [ ] **Step 9.5: Wait for JavaScript bundle to download (~10–30 seconds first time)**

  Expected: splash screen with green dot appears briefly, then "Hello, Golf" renders centered on dark background, in Inter font, with the small green "v0.0.1" badge below.

- [ ] **Step 9.6: PHASE GATE — confirm visual match**

  The screen should look exactly like the approved direction:
  - Background: very dark (`#08100c`, almost black-green)
  - Title "Hello, Golf" in Inter Light, large, slightly off-white
  - Subtitle "PHASE 0 · SETUP" in muted gray, smaller, uppercase, letter-spaced
  - Green pill badge "v0.0.1" with soft green fill and outline

  ✅ If yes → Phase 0 visual gate **PASSED**.
  ❌ If anything looks wrong → debug before continuing. Most likely cause: NativeWind config didn't pick up the custom colors; check `tailwind.config.js` and `metro.config.js`.

---

## Task 10: Configure EAS Build

**Files:**
- Create: `eas.json`
- Modify: `package.json`

- [ ] **Step 10.1: Install EAS CLI globally**

  ```bash
  npm install -g eas-cli
  ```

- [ ] **Step 10.2: Log in to Expo**

  ```bash
  eas login
  ```

  Use the credentials from User Step 0.2.

- [ ] **Step 10.3: Initialize EAS in the project**

  ```bash
  eas init
  ```

  This creates an EAS project linked to the user's Expo account, and writes the project ID into `app.json` (under `expo.extra.eas.projectId`).

- [ ] **Step 10.4: Create eas.json**

  Create file `eas.json`:

  ```json
  {
    "cli": {
      "version": ">= 5.0.0",
      "appVersionSource": "remote"
    },
    "build": {
      "development": {
        "developmentClient": true,
        "distribution": "internal",
        "ios": {
          "simulator": true
        }
      },
      "preview": {
        "distribution": "internal",
        "ios": {
          "simulator": false
        }
      },
      "production": {
        "autoIncrement": true
      }
    },
    "submit": {
      "production": {}
    }
  }
  ```

- [ ] **Step 10.5: Verify EAS config**

  ```bash
  eas build:configure
  ```

  Expected: confirms iOS configuration is valid. May prompt for additional settings — use defaults.

- [ ] **Step 10.6: Commit**

  ```bash
  git add -A
  git commit -m "chore: configure EAS Build profiles"
  ```

  *Note:* We are NOT running an actual EAS build in Phase 0. EAS builds take 15–25 minutes and consume free-tier credits. We'll do the first real build in Phase 1 once we need a custom dev client (for Sign in with Apple). Phase 0 only requires Expo Go to validate visuals.

---

## Task 11: Add README and .gitignore polish

**Files:**
- Create: `README.md`
- Modify: `.gitignore`

- [ ] **Step 11.1: Update .gitignore**

  Append to `.gitignore`:

  ```
  # macOS
  .DS_Store

  # IDE
  .vscode/
  .idea/

  # Local env
  .env
  .env.local

  # Brainstorming artifacts
  .superpowers/

  # OS / build artifacts
  *.log
  ```

- [ ] **Step 11.2: Create README.md**

  Create file `README.md`:

  ```markdown
  # Golf App

  Social golf-scoring iOS app. Track scorecards, follow friends, see a feed of recent rounds.

  ## Stack
  - React Native + Expo (TypeScript, strict mode)
  - Expo Router (file-based navigation)
  - NativeWind 4 (Tailwind-style styling)
  - Inter font
  - Supabase (Phase 1+)

  ## Local development

  Prerequisites: Node 20+, Expo Go on your iPhone (or iOS Simulator on macOS).

  \`\`\`bash
  npm install
  npx expo start
  \`\`\`

  Scan the QR code with your iPhone's camera to open the app in Expo Go.

  ## Scripts
  - \`npm run typecheck\` — TypeScript check
  - \`npm run lint\` — ESLint
  - \`npm run format\` — Prettier
  - \`npm test\` — Jest (configured in Phase 1)

  ## Design system
  - **Palette:** see \`theme/colors.ts\`
  - **Typography:** Inter (Light/Regular/Medium/SemiBold/Bold)
  - **Tokens consumed via:** Tailwind classes (\`bg-bg-base\`, \`text-text-primary\`, etc.) or direct \`colors.*\` import

  ## Documentation
  - Spec: \`~/.claude/plans/i-have-an-app-rippling-puzzle.md\`
  - Implementation plans: \`docs/superpowers/plans/\`
  ```

- [ ] **Step 11.3: Commit**

  ```bash
  git add -A
  git commit -m "docs: add README and gitignore polish"
  ```

---

## Task 12: Phase 0 verification checklist

**Files:** none — this is the final gate before declaring Phase 0 done.

- [ ] **Step 12.1: All Task 0 user actions completed**

  Confirm with user:
  - Apple Developer Program: enrolled (or pending verification)
  - Expo account: created
  - Supabase account: created
  - Sentry account: created
  - PostHog account: created
  - Expo Go: installed on iPhone

- [ ] **Step 12.2: Project boots cleanly**

  Run: `rm -rf .expo node_modules && npm install && npx expo start --clear`

  Expected: clean install + boot, QR code appears.

- [ ] **Step 12.3: All scripts pass**

  ```bash
  npm run typecheck && npm run lint
  ```

  Expected: both succeed with no errors.

- [ ] **Step 12.4: Visual gate confirmed on real iPhone**

  User has scanned the QR and seen "Hello, Golf" in the approved style on their actual phone (Step 9.6).

- [ ] **Step 12.5: All commits pushed (if remote configured)**

  Optional for Phase 0; required before Phase 1 if collaborating.

- [ ] **Step 12.6: Tag the milestone**

  ```bash
  git tag -a phase-0 -m "Phase 0 complete: project setup, design system, first build to iPhone"
  ```

---

## Phase 0 Completion Criteria

Phase 0 is complete when ALL of the following are true:

1. ✅ User has all required accounts (Apple Developer, Expo, Supabase, Sentry, PostHog)
2. ✅ Repo initialized at `/Users/gavingillespie/Desktop/Golf App/` with Expo + TypeScript strict mode
3. ✅ Expo Router installed with file-based routing
4. ✅ NativeWind 4 configured with the approved color tokens
5. ✅ Inter font loaded across all weights
6. ✅ `theme/colors.ts` and `theme/typography.ts` exposing typed tokens
7. ✅ Placeholder app icon + splash + Info.plist purpose strings
8. ✅ ESLint + Prettier + tsc all pass
9. ✅ EAS Build configured (no actual build run yet)
10. ✅ User scans QR in Expo Go and sees "Hello, Golf" rendered in the approved style on their real iPhone
11. ✅ Git tagged `phase-0`

After Phase 0: write the Phase 1 implementation plan (Auth + core scoring), which will introduce Supabase, the database schema, Sign in with Apple, and the round-entry flow.
