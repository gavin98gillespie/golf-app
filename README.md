# Linksman

Golf scoring and continuing rivalries for people who play together. Built with Expo SDK 57, React Native, TypeScript, Expo Router, TanStack Query and Supabase.

The existing app includes solo/group scoring, invitations, profiles, follows, feed and statistics. The planned rivalry layer adds brass points, games, head-to-head history and circles. The primary experience is for 2–4 players, with readable controls and optional detail for golfers of different ages and comfort with apps.

## Development

Use Node 22:

```sh
npm ci --legacy-peer-deps
npm start
```

Expo Go can be used for compatible development testing on a phone. Keep the phone and development machine on the same network. Installed development/release builds and real iOS/Android testing remain part of release validation.

Local `.env.local` supplies `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, plus an optional `EXPO_PUBLIC_SENTRY_DSN`. Never commit secrets. Administrative scripts may use a service-role key; it must never be prefixed `EXPO_PUBLIC_` or included in client code.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npx expo export --platform ios
npx expo export --platform android
```

Tests include scoring state/persistence and all database migrations executed in isolated PGlite PostgreSQL. Database tests simulate Supabase auth roles; they do not connect to or validate the hosted project. PGlite is a development dependency only.

## Current reliability work

- Shared scoring drafts wait for loading and serialize server writes.
- Pending score edits are journaled on the phone and recovered when the same player reopens that round/hole.
- Local recovery is not complete offline round support: authentication and round/course loading still require their existing network paths. Finishing still requires server acknowledgment. Multi-device conflict resolution remains outstanding.
- The three September 8 migrations harden round access, make solo finalization atomic and publish scoring tables to Realtime. They have been applied and verified on the linked golf-app-dev project; other environments must apply them separately.

Before applying migrations to a hosted project, check migration/schema drift and backup availability, verify in staging, regenerate database types and run two-phone acceptance tests. GitHub pushes do not deploy database changes.

## Project references

- `docs/superpowers/plans/2026-09-08-reliability-and-melbourne-beta.md`: current delivery plan and phone tests.
- `docs/2026-09-08-product-and-engineering-review.md`: review findings and priorities.
- `docs/superpowers/specs/2026-09-07-linksman-rivalry-ledger-design.md`: rivalry product proposal.
- `theme/linksman.ts`: canonical palette and typography.
- `supabase/migrations/`: versioned database changes.
- `lib/scoring/`: testable scoring state and durable journal.

Earlier handoffs describe historical state. The current plan records subsequent changes and remaining limitations.
