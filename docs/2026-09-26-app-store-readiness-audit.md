# Linksman: App Store readiness and operating plan

Audit date: September 26, 2026. Source revision: `e7c499a` on `codex/reliability-and-score-recovery`.

## Assessment

**Linksman is a working private alpha / early beta, not yet a public release candidate.** The React Native / Expo / Supabase architecture is suitable. There is no evidence that a rewrite or a custom server fleet is needed. The remaining work is primarily reliability, data integrity, production configuration, device validation, and operating the service responsibly.

The product already has a useful core: one person can score a group, saved guests avoid requiring everyone to register, followers can see permitted rounds without reciprocal following, and Skins plus manual Brass entries support the rivalry ledger. Preserve that simplicity. Security fixes should protect accounts and shared infrastructure without adding score approvals or changing the honor system.

A public launch should promise a small set of dependable capabilities: start a solo or group round, score it in poor reception, finish it without losing data, calculate games correctly, and see friends and rivalry history. More games, payments, push notifications, and broader social features can wait.

## Audit scope and evidence

Reviewed application routes/components, authentication, query hooks, score persistence, game calculations, database migrations and access rules, release configuration, existing tests, and legal pages. Inspected the connected Supabase service read-only. Reproduced permission cases in an isolated PGlite database using all repository migrations and synthetic accounts; no hosted user data was changed.

This is not a penetration test, measured load test, or a complete fresh native-device walkthrough. Previously successful Expo Go flows and JavaScript exports do not establish that a signed production binary works. Physical iPhone and Android acceptance testing remains required.

| Check | Result |
| --- | --- |
| TypeScript | Pass |
| Automated tests | 58 passed, 0 failed |
| ESLint | 0 errors, 14 formatting warnings |
| Expo Doctor | 20/21 checks passed; nine packages behind recommended SDK patch versions |
| Production dependency audit | 23 affected package entries: 1 critical, 4 high, 16 moderate, 2 low |
| Public privacy/terms URLs | Both returned HTTP 200 |
| Hosted migrations | All 27 repository migrations deployed |
| Public-table row-level security | Enabled on all 16 tables; policy correctness still needs fixes |

Dependency counts include transitive/build tooling and inherited advisories, not 23 demonstrated app exploits. `shell-quote` accounts for the critical entry; other findings include `ws`, XML parsing, and build tooling. Review dependency paths and actual exposure, apply compatible updates, and repeat checks. Do not run `npm audit fix --force`: suggested fixes include incompatible Expo downgrades.

## Connected backend snapshot

| Item | Observed |
| --- | --- |
| Project | `golf-app-dev`, active/healthy, US West region |
| Database size | Approximately 22 MB |
| Profiles / rounds / recorded holes | 11 / 16 / 207 |
| Course catalog / course-hole definitions | 13,757 / **0** |
| Reports | 0 |
| Backup API | No listed backups; point-in-time recovery disabled |
| Custom authentication email sender | Not configured |
| Email confirmation | Disabled |
| Authentication site URL | `http://localhost:3000` |
| Server password minimum | 6 characters; app form requires 8 |
| CAPTCHA | Disabled |
| Account deletion function | Deployed and active |

Only one connected project was found. Production/staging separation, billing tier, backup recovery, and alert delivery are not verified. An empty backup response is not proof that no infrastructure-level recovery exists; it means an owner-accessible recovery process has not been established.

The deletion function disables gateway JWT verification but validates the bearer token with `auth.getUser()` inside the function before deleting an account. That is not, by itself, an unauthenticated account-deletion vulnerability.

## Findings and required work

### 1. Correct database write permissions before wider testing — high priority

`supabase/migrations/20260502035301_init_rls.sql` allows authenticated accounts to insert/update hole definitions on any unverified course, without checking ownership. It also allows an account to insert its own user-sourced course with `verified=true`.

**Reproduced locally:** account B edited account A's unverified course hole; account B created a supposedly verified course. The corresponding policies are deployed on the connected backend.

Restrict catalog changes to the intended creator/admin workflow and reserve verification for trusted server administration. Add negative tests for other-account edits and forged verification. This concerns shared course data, not the intentionally collaborative editing of a group's scores.

### 2. Establish backups and production separation — launch blocker

A GitHub copy protects code, not golfers' scores. Establish a paid production project with managed backups, a separate safe development/test environment, and restricted administration. Test restoring data into an isolated environment before launch, including migrations, account relationships, score history, and Brass balances. Document what data can be lost between backups and how long restoration takes.

Use MFA for owner accounts, least-privilege access, protected secrets, billing alerts, and a documented recovery contact. Never embed the Supabase service-role key in a client build. Only the public URL and publishable/anonymous client key belong there; database policies enforce access.

### 3. Finish offline scoring and reliable writes — launch blocker

`useScoreDraft` already journals unsaved score edits locally and waits for writes before navigation. This is valuable recovery protection. It is **not a complete offline round**: failed writes can block moving between holes, and there is no verified durable offline cache/outbox for the entire round, players, and course.

Implement and test a durable queue of score changes, cached active-round information, clear saved/pending status, and deterministic conflict handling. One scorekeeper should be able to complete 9 or 18 holes without reception, force-close/reopen, reconnect, and reconcile exactly once. Preserve the honor system; show the last editor where helpful.

`lib/queries/rounds.ts` and `groupRounds.ts` create a round and its player record through separate requests. A failure between them can leave an incomplete round. Use transactional server functions and stable request identifiers. Manual `save_side_game` creation also needs retry protection: a lost response followed by resubmission currently creates a new identifier and can duplicate a Brass entry.

### 4. Finish public account recovery and privacy behavior — launch blocker

The password-reset interface exists, but public delivery is not production-ready. Supabase's default sender is limited to project-team addresses and a small sending allowance. Set up a domain and custom sender; test recovery and confirmation links in installed iOS/Android builds, including cold starts and expired links. Replace localhost defaults and align redirect allowlists, templates, and password rules. [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp)

The privacy policy promises a private-profile setting, but there is no corresponding usable setting/enforcement. A synthetic private-profile account's followed, shared round remained readable in the local test. This does **not** mean private-round protection is broken: round-level privacy is a separate feature. Either implement private profiles consistently or remove that promise and explain the actual round-sharing choices.

`lib/auth.ts` and `lib/hooks/useSession.tsx` do not clear user-sensitive React Query state on account changes. Several query keys omit the viewer. Cached data from the previous account can therefore remain available before an authorized refetch. Backend rules do not erase a phone's cache. Cancel/reset sensitive queries at identity changes and test switching between accounts with different visibility permissions.

### 5. Validate course data before claiming accurate golf statistics — high priority

The catalog contains many course names, but the hosted `course_holes` table is empty. Scoring has a par-4 fallback. Course names alone do not provide trustworthy par, stroke indexes, tee information, or yardages; those affect relative-to-par statistics and net games.

For the initial launch, curate and verify the courses used by the test group, and make unknown pars/indexes explicit and editable. Do not silently present defaults as official course information. Validate 9-hole courses and tee selection. The app currently has US-oriented defaults; confirm launch geography before expanding the catalog.

Review OpenStreetMap attribution and database-license obligations for imported course data. No visible attribution was found in the app source reviewed. [OpenStreetMap copyright and license](https://www.openstreetmap.org/copyright)

### 6. Make feeds, statistics, and ledger queries scale correctly — high priority

`lib/queries/feed.ts` loads followed IDs and round-player IDs before limiting the final result to 30 rounds. Earlier requests are unpaginated and unordered. API row limits can omit relevant rounds as history grows, even when the last request requests only 30.

`lib/queries/detailedStats.ts` fetches all eligible rounds and holes without pagination. At a 1,000-row API cap, roughly 56 full 18-hole rounds would exceed one holes response. The actual hosted cap was not independently verified; the underlying unbounded-query problem remains. Aggregate statistics server-side and paginate histories with stable cursors.

Feed cards issue additional like/comment/group queries; comments are fetched to derive counts, and group cards create realtime subscriptions. Consolidate summaries, fetch comments when opened, and keep subscriptions focused on visible/active content. The ledger polls full history every ten seconds. With 1,000 simultaneously visible ledgers, that alone implies roughly 100 calls/second before other traffic; this is arithmetic, not a tested capacity limit.

Existing indexes cover many core paths. Inspect query plans for newer side-game and guest lookups before adding targeted indexes. Run staging load tests against realistic long histories and simultaneous scoring before advertising a user-capacity number.

### 7. Define shared-history deletion and Brass invariants — high priority

Current cascading ownership relationships can remove a hosted group round and related game history when the host deletes their account. Decide whether other participants retain an anonymized scorecard or lose the shared record, then implement and document that behavior. Test account deletion, player removal, score corrections, side-game edits/deletes, and recalculation together.

Saved guest selection already exists in `components/InviteSearchSheet.tsx`; preserve stable guest identities across rounds so rivalry history does not split accidentally. Test duplicate names and intentional guest reuse.

Brass is currently a points ledger, not a payment service. Test balanced transfers, literal amounts such as 50 Brass, decimal/maximum limits, self-transfers, ties/carryovers, and repeat edits. Do not add payment custody or cash-out to the first release. If the product is marketed or used as a real-money wagering service, calling the unit Brass does not settle legal or store-policy questions; review the actual functionality before expanding. [Apple review rules, including gaming](https://developer.apple.com/app-store/review/guidelines/)

### 8. Finish monitoring and moderation operations — launch blocker

Sentry integration and a local DSN exist. Production event delivery, source maps, release identification, alerts, and an owner response process are not verified. An error boundary alone does not report every failed score save or backend outage. Trigger a controlled error in a release build and verify a useful alert actually arrives.

Add service-health checks and actionable alerts for failed score writes, authentication failures, elevated database errors, backup failures, and approaching limits. Avoid logging passwords, tokens, private notes, or unnecessary personal information.

Reporting, blocking, and profanity filtering exist, but there is no verified report-triage workflow. A small beta can use a secured administrative process rather than a custom dashboard; someone still needs to receive reports and act. Apple's social-content requirements include reporting, blocking, filtering, and published contact information. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### 9. Complete native release setup and regression checks — launch blocker

`app.json` has a generic iOS identifier and no Android package identifier. Finalize these before store registration. EAS profiles exist, but production environment separation, signing, upload, and installed release behavior are unverified. The development profile requests a development client while `expo-dev-client` is not installed; reconcile the chosen testing workflow.

No repository CI workflow was found. Add checks for type safety, linting, tests, dependency compatibility, and database migration/access-rule regressions on each proposed release. Add a small automated end-to-end smoke suite for sign-up, round completion, and recovery. Update the nine Expo patch mismatches with a compatible dependency set and validate native builds.

Review permission descriptions: contacts are declared despite no corresponding implemented contacts feature being found. Inspect generated native permissions, not only JavaScript configuration. Match privacy declarations and store questionnaires to actual profile, round, social, location, and diagnostics handling. Check artwork and screenshots in the final build. Legal pages load, but contain older branding and behavior claims that need revision.

OTA updates are not currently configured. They are optional for launch; ordinary store updates work. If added, define compatible runtime versions, release channels, staged rollout, and rollback before using them on production users.

### 10. Complete device and accessibility testing — launch blocker

A complete fresh visual walkthrough was not performed in this audit. Source review cannot certify keyboard placement, scroll behavior, large text, touch targets, or native lifecycle behavior.

Use small and large iPhones and at least one real Android device. Include older golfers, bright outdoor conditions, enlarged text, VoiceOver/TalkBack, denied location access, and long names. Verify every text field stays visible with its keyboard and has an obvious dismissal path. Many small labels warrant review for readability.

Required scenarios: fresh install; signup/sign-in/recovery/sign-out; account switching; Home/search/profile/private-round/block/report; solo and 2–4-player rounds; saved guests; 9/18 holes; background/phone interruption/force-close; offline/reconnect; finish/edit/delete; Skins and manual games; ledger reconciliation; expired sessions; account deletion. Keep a device/build/result checklist rather than relying on memory.

## Is Supabase sufficient?

**Yes, it is a reasonable backend for this product and an initial public launch.** Readiness depends on schema, policies, query efficiency, backups, and operations—not on whether the database brand is acceptable to Apple.

Current data is tiny and does not establish performance under load. For illustration, 1,000 golfers recording eight 18-hole rounds per month generate 144,000 golfer-hole records per month, before comments, games, indexes, and logs. A four-player scorecard has 72 golfer-hole records; do not count those players twice when estimating individual usage. This is a planning scenario, not a benchmark or promised capacity.

Start with managed production hosting and measure query latency, error rate, connections, storage growth, and cost. Improve inefficient queries before increasing compute. Supabase Pro currently starts at US$25/month and includes daily backups with seven-day retention; Free projects may pause after inactivity and do not include automatic backups. Billing quotas are not guarantees of concurrent-user performance. [Supabase pricing](https://supabase.com/pricing)

Before launch, rehearse 100 and then 500 concurrent simulated users in staging, with realistic mixes of scoring, feed browsing, and ledger activity. Define acceptable latency and zero-loss scoring criteria in advance; do not run stress tests against the current shared project.

## Release path

Neither developer account is enrolled yet.

1. **Harden the core.** Fix permissions, reliable writes/offline scoring, account/cache behavior, query bounds, and course data. Establish email, backups, monitoring, and production separation.
2. **Enroll and create a signed iPhone beta.** Choose account ownership and final bundle identifier, enroll in Apple Developer, configure production EAS builds, and distribute through TestFlight. Apple membership is US$99/year or local equivalent. [Apple membership](https://developer.apple.com/programs/whats-included/)
3. **Run a real-course beta.** Aim for 10–20 testers and at least 20–30 completed real rounds over 2–4 weeks, including guests and mixed group sizes. These are proposed internal quality gates, not store requirements. Require no unresolved data-loss/privacy issues and verify restoration and recovery.
4. **Prepare Apple submission.** Supply listing copy/screenshots, privacy/support URLs, age rating, accurate data disclosures, review login/instructions, and a live backend. Test the exact submitted build. Account deletion must work within the app. Submit, address review feedback, and release gradually. [Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
5. **Validate Android using the shared codebase.** Configure the Android package/signing, test Android-specific keyboards/back navigation/permissions/lifecycle, and distribute a closed beta. Google registration is US$25 once. Newly created personal accounts require at least 12 continuously opted-in testers for 14 days before applying for production access. [Google registration](https://support.google.com/googleplay/android-developer/answer/6112435), [testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)
6. **Complete Google-specific listing and deletion requirements.** Include Data safety disclosures and an external deletion-request route as well as in-app deletion. [Google account deletion policy](https://support.google.com/googleplay/android-developer/answer/13327111)

Android does not require rebuilding the product from scratch. It does require a genuine native test/release pass. A browser version is a separate optional project; it is not automatically production-ready because this is an Expo app.

**Timing:** treat this as several focused engineering weeks plus field testing and enrollment/review time. A provisional planning allowance is 6–10 engineering weeks for a disciplined first release, with longer calendar time if work is intermittent or offline/release testing uncovers larger issues. This is an estimate, not a deadline. Re-estimate after the first reliability milestone. Shipping more features before that milestone makes the estimate less reliable.

## How the published app stays running

| Piece | Role | Requires your Mac running? |
| --- | --- | --- |
| Installed App Store/TestFlight app | Contains the shipped application code | No |
| Supabase | Accounts, scores, permissions, game data | No; cloud service |
| Email provider | Recovery/verification delivery | No |
| EAS / store distribution | Builds and distributes releases | No after installation |
| GitHub | Versioned source and automated checks | No |
| Monitoring | Reports crashes/outages to an owner | No, but someone must respond |

Expo Go currently downloads development code from a development server. A production binary bundles its code and stops depending on that server, although online features still need the cloud backend. [Expo production builds](https://docs.expo.dev/deploy/build-project/)

Suggested owner routine:

- **Alerts as they arrive:** investigate service outages, lost-score reports, security issues, and elevated save failures. Communicate with affected testers/users.
- **Daily during beta:** review feedback and moderation reports; confirm core service health.
- **Weekly after stabilization:** review crash/error trends, database growth/cost, support requests, reports, and authentication-email delivery.
- **Monthly:** test a backup restoration, review dependencies/security advisories, test current OS versions, and ship controlled maintenance updates.
- **Every release:** CI checks, staging migrations, device smoke test, backup verification, release notes, rollback plan, and post-release monitoring.

Keep a short incident runbook: identify the affected version/service, stop a damaging rollout, preserve evidence, restore or repair in staging first, verify scores/ledger totals, and communicate recovery. Database migrations need compatible forward fixes; rolling back JavaScript alone does not undo a schema change.

You own accounts, billing, product decisions, moderation, support, and release approval. Development help can implement and test changes, but an unattended app still needs an accountable human and maintenance capacity. This audit did not configure ongoing monitoring or enroll any services.

## Budget and business readiness

Use **US$50–150/month as an initial planning allowance** for a small public launch, not a quote. It covers a modest managed database setup and room for email, monitoring, build usage, and a domain; actual cost depends on usage, environments, and plans. Add Apple US$99/year and Google US$25 once. It excludes engineering time, legal advice, marketing, taxes, and large-scale traffic. Review actual bills and spending limits before committing to plans.

A free first release is viable without subscriptions. Paid features would additionally require purchasing/entitlements, restoration, cancellation/support handling, and store-policy review. Do not treat a payment button as the entire monetization implementation.

For this product, the early business test is whether groups repeatedly choose Linksman for their next round and trust the ledger enough to keep their history there. Track privacy-conscious activation (first completed round), repeat group usage, score-save success, and game/ledger usage. Validate willingness to pay after the core experience works; avoid adding paywalls before that evidence exists.

## Recommended immediate sequence

1. Correct course write permissions and add regression coverage.
2. Make round/game creation retry-safe and isolate account caches.
3. Finish and test offline scoring; verify course par/index data.
4. Configure production email, backups/restoration, environments, and monitoring.
5. Paginate/aggregate queries and run realistic staging checks.
6. Enroll Apple and move routine testing from Expo Go to TestFlight.
7. Complete real-device, accessibility, privacy/moderation, and submission gates.

No application behavior, hosted data, billing plan, or store account was changed by this audit.
