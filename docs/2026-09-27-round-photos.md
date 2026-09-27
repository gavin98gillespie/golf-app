# Round photos

Two attachment types share the existing round and do not create additional feed posts:

- Ace: one photo per player/hole, available after saving a score of 1. An inline prompt includes Not now; the same option remains on the round detail. Correcting/deleting that score removes its photo metadata.
- Group: one photo for the whole round, available once the group is finished. It appears with the round on each active participant's profile.

Scorekeepers can upload for the group or a player's ace. Only the uploader can replace/remove their image. Photos use the existing round visibility, following and blocking rules, including one-way followers. Reports use the existing Report round control. The feed has a horizontal photo strip; profiles use a compact Highlights section with an 84-pixel thumbnail, achievement, course, location when available, and the played date (not upload date). Only the latest highlight is shown initially; Show more expands up to 30 recent photos linked to their rounds. Both cream and dark profile surfaces are supported. Full-size viewing uses a dismissible image modal.

Native camera and system photo-library picker, JPEG conversion, a 1600-pixel longest edge, and a 5 MiB server upload limit. Upload failures retain bytes for an on-screen retry while the control remains mounted; leaving the screen may require selecting the photo again. Scores do not depend on successful photo upload.

## Storage and maintenance

The `round-photos` bucket is private. Read policies reference visible photo metadata. Signed URLs expire in five minutes. Replacements upload to a new path before replacing the metadata, preserving the previous photo if upload fails.

Metadata cascades on participant, round and account deletion. Replaced/deleted files enter `photo_cleanup_queue`; an authenticated cleanup Edge Function removes queued blobs through the Storage API. The app requests cleanup after photo changes and at signed-in app startup. Failed cleanup remains queued. Account deletion also removes all of that user's Storage files before deleting the auth account. Before a production launch, schedule queue cleanup independently of app traffic and add monitoring/orphan sweeps for uploads interrupted before metadata creation.

Supabase migrations and both Edge Functions are deployed to the linked development project. The SQL integration test covers upload eligibility, duplicate slots, ownership, storage RLS, one-way follower access, blocks, profile association and correction cleanup. A live smoke test used temporary private fixtures and verified upload, signed URL access, denial for an unrelated account, physical Storage removal, and account deletion with an attached image, then removed the fixtures.

Validation: 70 automated tests passed; TypeScript passed; ESLint has zero errors and 14 pre-existing formatting warnings; iOS and Android JavaScript exports passed.

Native camera/library and visual checks remain for a physical iPhone: simulator control timed out. Verify an ace photo in a solo and group round; dismiss/retry an upload; finish a group and add its photo; inspect the feed and both profiles; replace/remove an image; correct the ace score. iOS/Android JavaScript bundle checks are separate from production native builds.
