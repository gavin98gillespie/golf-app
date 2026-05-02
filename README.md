# Golf App

Social golf-scoring iOS app. Track scorecards, follow friends, see a feed of recent rounds.

## Stack

- React Native + Expo SDK 54 (TypeScript, strict mode)
- Expo Router (file-based navigation)
- NativeWind 4 (Tailwind-style styling)
- Inter font
- Supabase (Phase 1+)

## Local development

Prerequisites: Node 20+, Expo Go on your iPhone (or iOS Simulator on macOS).

```bash
npm install --legacy-peer-deps
npx expo start
```

Scan the QR code with your iPhone's camera to open the app in Expo Go.

## Scripts

- `npm run typecheck` — TypeScript check
- `npm run lint` — ESLint
- `npm run format` — Prettier
- `npm run start` — Start Expo dev server

## Project structure

```
app/                Expo Router screens (file-based routing)
  _layout.tsx       Root layout, font loading
  index.tsx         Home / welcome screen
theme/              Design tokens
  colors.ts         Approved palette
  typography.ts     Font weight constants
  index.ts          Barrel export
docs/superpowers/   Specs and implementation plans
assets/             App icons, splash images
```

## Design system

- **Palette:** see `theme/colors.ts`
- **Typography:** Inter (Light/Regular/Medium/SemiBold/Bold)
- **Tokens consumed via:** Tailwind classes (e.g., `bg-bg-base`, `text-text-primary`) or direct `colors.*` import

## Documentation

- High-level spec: `~/.claude/plans/i-have-an-app-rippling-puzzle.md`
- Phase implementation plans: `docs/superpowers/plans/`

## Status

Phase 0 — project setup. Renders "Hello, Golf" placeholder welcome screen.
