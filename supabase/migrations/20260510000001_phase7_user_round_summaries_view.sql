-- Per-(round, user) summary: each row is one player's view of one round.
-- For solo rounds, there's exactly one row per round (the host).
-- For group rounds, there's one row per participant.
-- Score totals are computed from round_holes for that player_id.
CREATE OR REPLACE VIEW user_round_summaries
WITH (security_invoker = on)
AS
SELECT
  rp.round_id,
  rp.user_id,
  rp.status                              AS player_status,
  rp.tee_box                             AS player_tee_box,
  rp.notes                               AS player_notes,
  rp.joined_at,
  rp.finished_at,
  r.id                                   AS round_id_dup,
  r.user_id                              AS host_id,
  r.course_id,
  r.tee_box                              AS round_tee_box,
  r.played_at,
  r.hole_count,
  r.is_group,
  r.live_visible,
  r.is_draft,
  r.notes                                AS round_notes,
  r.visibility,
  r.created_at,
  r.updated_at,
  COALESCE(SUM(rh.score), 0)::int        AS total_score,
  COALESCE(SUM(rh.par), 0)::int          AS total_par,
  COUNT(rh.*)::int                       AS holes_played
FROM round_players rp
JOIN rounds r ON r.id = rp.round_id
LEFT JOIN round_holes rh ON rh.round_id = rp.round_id AND rh.player_id = rp.user_id
GROUP BY rp.round_id, rp.user_id, rp.status, rp.tee_box, rp.notes, rp.joined_at, rp.finished_at,
         r.id, r.user_id, r.course_id, r.tee_box, r.played_at, r.hole_count, r.is_group,
         r.live_visible, r.is_draft, r.notes, r.visibility, r.created_at, r.updated_at;

GRANT SELECT ON user_round_summaries TO authenticated;
