# Simpler navigation and signup

The September 24 request replaces the Today/Feed/Search/Me structure and mandatory onboarding sequence.

## Product decisions

- **Home** is the default tab: the shared-round feed with a persistent “Find golfers or courses” field above it. Search results replace the round list in place. Done dismisses the keyboard; Back to rounds clears the search. Opening a result and returning preserves the search.
- **New round** is the center action, with the existing solo/group chooser and optional join-code entry.
- **Me** holds the golfer’s profile, round history, statistics and rivalry ledger. Edit profile changes name, username and optional bio. Home course stays optional in Settings. The legacy invitation shortcut only appears if there are pending invitations.
- Signup asks for name, username, email and password on one scrollable form. There is no course-selection, friend-selection or introductory walkthrough. Email confirmation still applies when enabled on Supabase.
- Existing profiles enter Home regardless of their old onboarding flag. Legacy onboarding routes redirect safely. Accounts created by old clients without profile metadata use a short name/username completion form, then enter Home.

Home is recommended over a golf-specific label because it clearly identifies the app’s starting screen. “Clubhouse” is a possible future label if a more social tone is wanted; “Activity” is another literal option. Familiar wording is preferable while the basic flow is being simplified.

## Implementation

The database creates a basic profile from signup metadata inside the auth-user creation transaction. Profile constraints and username uniqueness remain enforced; a failed profile insert does not leave a half-created auth account. Optional or permission-related fields are not copied from signup metadata. The profile trigger does not overwrite existing accounts. Migration `20260924000001_simple_signup.sql` is deployed.

Old feed/search paths remain redirect aliases to avoid breaking old links. Home preserves unfinished solo and group round entry points; solo resumes at the first unscored hole. Tab navigation preserves mounted screen state. Search is debounced and shows loading, empty and retry states. The tab bar occupies layout space instead of covering the last list row.

## Reference pattern

Venmo separates basic account registration from later use of its social features; Linksman adopts the familiar navigation and basic registration pattern without adding payment-specific setup. See [Venmo personal account signup](https://help.venmo.com/cs/articles/how-to-sign-up-for-a-personal-venmo-account-vhel211). The transactional profile implementation follows [Supabase user-management guidance](https://supabase.com/docs/guides/auth/managing-user-data).

## Validation

58 automated tests pass, including new signup normalization, atomic profile creation, duplicate-username rollback, invalid metadata, legacy account fallback, and anonymous availability checks. TypeScript and changed-file lint pass. iOS and Android production bundles export successfully.

Native iPhone 16e simulator checks cover the single signup form, email keyboard/Done, login with an old incomplete-onboarding flag, Home’s three navigation controls, inline golfer search, keyboard dismissal, opening a golfer and returning with the query preserved, returning to rounds, the New round chooser, Me, profile-name editing and the ledger link. Test accounts were created through the admin API without sending emails; the GUI signup submission/terms acceptance was not exercised. Physical iPhone, larger accessibility text and Android visual checks remain necessary.

The populated Home check verified a one-way followed round and resuming a two-hole draft at hole three. A native layout issue that hid stacked score numerals was corrected and visually checked on Home and the solo score screen.
