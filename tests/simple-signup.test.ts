import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { SignUpSchema, ProfileBasicsSchema } from '../lib/profileForm';

test('basic signup normalizes names and validates without optional setup', () => {
  const parsed = SignUpSchema.parse({
    displayName: '  Gavin G  ',
    username: ' Gavin_G ',
    email: ' golfer@example.com ',
    password: 'a-valid-password',
  });
  assert.equal(parsed.displayName, 'Gavin G');
  assert.equal(parsed.username, 'gavin_g');
  assert.equal(parsed.email, 'golfer@example.com');
  assert.equal(
    ProfileBasicsSchema.safeParse({ displayName: '   ', username: 'golfer' }).success,
    false,
  );
  assert.equal(
    ProfileBasicsSchema.safeParse({ displayName: 'Golfer', username: 'not valid' }).success,
    false,
  );
  assert.equal(
    ProfileBasicsSchema.safeParse({ displayName: 'test_blocked_word', username: 'golfer' }).success,
    false,
  );
});

test('signup profile is atomic and does not require an authenticated session', async (t) => {
  const db = new PGlite({ extensions: { pg_trgm, pgcrypto } });
  t.after(() => db.close());
  await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, raw_user_meta_data jsonb DEFAULT '{}'::jsonb);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;`);
  const path = new URL('../supabase/migrations/', import.meta.url);
  for (const f of (await readdir(path)).filter((f) => f.endsWith('.sql')).sort())
    await db.exec(await readFile(new URL(f, path), 'utf8'));
  const a = '00000000-0000-4000-8000-000000000001',
    b = '00000000-0000-4000-8000-000000000002';
  await db.query('INSERT INTO auth.users(id,raw_user_meta_data) VALUES($1,$2)', [
    a,
    JSON.stringify({ username: ' New_Golfer ', display_name: ' New Golfer ', is_private: true }),
  ]);
  const profile = (
    await db.query<{
      username: string;
      display_name: string;
      onboarding_completed: boolean;
      home_course_id: null;
      is_private: boolean;
    }>('SELECT * FROM profiles WHERE id=$1', [a])
  ).rows[0];
  assert.ok(profile);
  assert.equal(profile.username, 'new_golfer');
  assert.equal(profile.display_name, 'New Golfer');
  assert.equal(profile.onboarding_completed, true);
  assert.equal(profile.home_course_id, null);
  assert.equal(profile.is_private, false);
  await assert.rejects(
    db.query('INSERT INTO auth.users(id,raw_user_meta_data) VALUES($1,$2)', [
      b,
      JSON.stringify({ username: 'new_golfer', display_name: 'Duplicate' }),
    ]),
    /unique/,
  );
  assert.equal((await db.query('SELECT id FROM auth.users WHERE id=$1', [b])).rows.length, 0);
  await assert.rejects(
    db.query('INSERT INTO auth.users(id,raw_user_meta_data) VALUES($1,$2)', [
      b,
      JSON.stringify({ username: 'bad space', display_name: 'Invalid' }),
    ]),
    /check/,
  );
  await db.query('INSERT INTO auth.users(id) VALUES($1)', [b]);
  assert.equal((await db.query('SELECT id FROM profiles WHERE id=$1', [b])).rows.length, 0);
  await db.exec('SET ROLE anon');
  assert.equal(
    (await db.query<{ available: boolean }>("SELECT is_username_available('new_golfer') available"))
      .rows[0]!.available,
    false,
  );
  assert.equal(
    (
      await db.query<{ available: boolean }>(
        "SELECT is_username_available('another_golfer') available",
      )
    ).rows[0]!.available,
    true,
  );
});
