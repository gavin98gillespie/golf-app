BEGIN READ ONLY;
SELECT json_build_object(
  'migrations', (SELECT json_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations),
  'policies', (SELECT json_agg(p) FROM (SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname) p),
  'triggers', (SELECT json_agg(t) FROM (SELECT tgname, pg_get_triggerdef(oid) definition FROM pg_trigger WHERE tgrelid IN ('public.rounds'::regclass,'public.round_players'::regclass,'public.round_holes'::regclass) AND NOT tgisinternal) t),
  'functions', (SELECT json_agg(f) FROM (SELECT p.proname, pg_get_function_identity_arguments(p.oid) args, p.prosecdef, p.proconfig, p.proacl, pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('force_end_round','redeem_join_code','is_in_round','generate_join_code','can_read_round','finalize_solo_round')) f),
  'constraints', (SELECT json_agg(c) FROM (SELECT conrelid::regclass::text relation, conname, pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conrelid IN ('public.rounds'::regclass,'public.round_players'::regclass,'public.round_holes'::regclass)) c),
  'realtime', (SELECT json_agg(tablename) FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public'),
  'counts', json_build_object('rounds',(SELECT count(*) FROM public.rounds),'players',(SELECT count(*) FROM public.round_players),'holes',(SELECT count(*) FROM public.round_holes)),
  'solo_backfill_count', (SELECT count(*) FROM public.round_players p JOIN public.rounds r ON r.id=p.round_id AND r.user_id=p.user_id WHERE NOT r.is_group AND NOT r.is_draft AND p.status='joined')
) AS preflight;
COMMIT;
