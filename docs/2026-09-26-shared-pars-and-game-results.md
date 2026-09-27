# Shared pars and game results

Group hole par is now a round-level setting. Changing it updates existing player cards and the defaults for unplayed cards; it never invents scores. The database rejects unauthorized changes and overrides stale par values on later score writes. Actual strokes and optional stats are preserved. Saved drafts receive the new par without re-submitting stale strokes from another phone.

In twosomes, picking the winner automatically selects the other player as payer, including when editing a result. Larger groups retain explicit payer selection. Side-game sheets use player selection cards, a game emblem, and a cream/brass amount panel.

The finale previously reused the per-hole game filter with its default of hole 1. It now shows entries from all holes, ordered by hole, including offsetting wins. Its Brass net result, game history and scorecards have separate visual headings, with an explicit Edit Scorecard control.

## Course coverage

54 default hole pars are loaded for the 18-hole layouts at Duran Golf Club, Viera East Golf Club and Baytree National. These are factual pars transcribed from official course sources, checked September 26, 2026. Source URLs and coordinates are stored in `data/courses/space-coast-pars.json`. No artwork or yardages were imported. This is a curated subset, not statewide coverage or a live course feed. Duran's short course is not included.

Run `npx tsx scripts/seed-course-pars.ts` for a preview; add `--apply` to fill missing default holes. The script matches exact names and coordinates, validates the layout length, preserves existing rows, and verifies stored values. Default pars are a fallback when no tee-specific data exists. Saved rounds keep their recorded pars; manual overrides remain available.

## Validation

Database migration deployed to the linked development project. Regression tests cover shared pars across players, unchanged strokes, unplayed holes, stale writes, authorization, draft recovery behavior and automatic twosome payers. iPhone simulator visually checked finale and twosome sheet; the actual 68–70 round exposes both game entries with zero net Brass. Physical-device keyboard and scroll behavior still need user testing.
