# Native visual walkthrough — September 13

Tested the current source in Expo Go 57.0.9 on an iPhone 16e simulator running iOS 18.4, using two isolated test accounts and a named guest. This is a substantial native walkthrough, not certification of every device or every route combination.

## Completed walkthrough

- Welcome, sign-in, initial sign-up and password recovery screens; profile creation and onboarding through course search, following a player, and completion. Recovery emails and password changes were not submitted.
- Course selection with location unavailable, course search, footer placement, and opening the add-course form from onboarding. Creating a disposable course from Settings returned to Settings and saved the selected home course.
- Today, Feed, own profile, another golfer’s profile, following list, empty invitations, trophy case, course detail, detailed statistics and 9/18-hole selection, Settings, and sign-out.
- One-way following: the followed test golfer followed nobody, yet their shared round appeared in Today, Feed and their profile.
- Create a nine-hole group, directly add another account and a guest, enable Skins, score all three players from one login, save a round note, and finish everyone with one action. The second player never logged in to approve or score.
- Open the completed group, correct a score, and open roster management after play started. The scorecard and profile statistics reflected the correction.
- Create a closest-to-pin transfer of 50 Brass, open it through the ledger, and edit it to 20.50. The ledger changed from −49 to −19.50 against that opponent while retaining the separate +1 Skins result against the guest at that point in the test.
- Solo regression: select nine holes, score all nine, inspect the summary and notes editor, save, and return to a profile with both completed rounds.
- Native keyboards inspected in onboarding/search, group player search, profile fields, course creation, round notes, comments, reports, and Brass amount/hole fields. Comments and reports were closed without submitting them.

## Problems found and corrected

- A partial round-author query shared the full profile cache key, dropping the cached onboarding flag and causing completed accounts to re-enter onboarding. Round details now use the canonical full-profile query.
- Numeric Brass keyboards could cover their inputs. The game form now adjusts its scroll inset and has a visible header Done action while the keyboard is open.
- Course creation during onboarding was intercepted by the onboarding route guard. Its return route now also preserves the selected course.
- Weekly summary and recent-course queries omitted rounds where the golfer was a participant rather than host. They now use participant summaries.
- A nine-hole solo round could project 72 strokes because of an 18-hole fallback. Projection now respects the selected hole count and known pars.
- Solo summary notes used dark text on a dark surface. The colors are corrected, and the note editor waits for save success before closing.
- Tight welcome layout, low-contrast placeholders/tab labels, missing input dismissal actions, duplicate game navigation, score-screen scroll position, and background-refresh layout jumps were addressed.
- A simulator network interruption exposed indefinite waiting. Requests now time out after 20 seconds; score drafts survive a failed save and can be retried. A retry during the walkthrough recovered the entered scores.

## Automated validation

- 56 tests passed, including database permission/settlement tests and request-timeout tests.
- TypeScript and ESLint for changed TypeScript files passed.
- Both iOS and Android production JavaScript bundles exported successfully.
- The honor-scorekeeping database migration is deployed.

## Remaining device coverage

Physical iPhone testing remains necessary. Android was bundle-tested, not visually exercised. Large accessibility text, landscape, long lists, all gesture-scroll behavior, simultaneous devices and every error path remain outside this pass. Simulator automation did not reliably execute drag/scroll gestures, so those gestures cannot be marked fully verified. Real recovery email delivery, account deletion, legal acceptance and report submission were deliberately not exercised. A custom email sender is still needed before public recovery-email testing.

The blue Expo developer control shown during testing is part of Expo Go, not the shipped app layout.

## Test data cleanup

The two disposable accounts, their test rounds, guest identity, test Brass records and the added QA course were removed after the walkthrough. The simulator was signed out first. Cleanup was scoped to the fixture identities; existing player data was not changed.
