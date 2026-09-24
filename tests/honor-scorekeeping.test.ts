import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const a = uid(1),
  b = uid(2),
  out = uid(3),
  round = uid(100),
  course = uid(200);
test('one scorekeeper, guests, automatic skins and editable Brass amounts', async (t) => {
  const db = new PGlite({ extensions: { pg_trgm, pgcrypto } });
  t.after(() => db.close());
  await db.exec(
    `CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, raw_user_meta_data jsonb DEFAULT '{}'::jsonb);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; GRANT USAGE ON SCHEMA public,auth TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;`,
  );
  const path = new URL('../supabase/migrations/', import.meta.url);
  for (const f of (await readdir(path)).filter((f) => f.endsWith('.sql')).sort())
    await db.exec(await readFile(new URL(f, path), 'utf8'));
  await db.exec(
    `INSERT INTO auth.users VALUES('${a}'),('${b}'),('${out}');INSERT INTO profiles(id,username,display_name) VALUES('${a}','keeper','Keeper'),('${b}','player_b','Player B'),('${out}','follower','Follower');INSERT INTO courses(id,name,source,hole_count) VALUES('${course}','Test','osm',9);INSERT INTO rounds(id,user_id,course_id,is_group,is_draft,hole_count) VALUES('${round}','${a}','${course}',true,true,9);INSERT INTO round_players(round_id,user_id,tee_box,status) VALUES('${round}','${a}','default','joined');`,
  );
  const asUser = async (id: string) => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec('SET ROLE authenticated');
  };
  const scalar = async <T>(sql: string, params: unknown[] = []) =>
    (await db.query<{ v: T }>(sql, params)).rows[0]!.v;
  const balance = () =>
    scalar<number>(
      "SELECT coalesce(sum((e->>'change')::numeric),0)::float v FROM jsonb_array_elements(get_my_brass_ledger())e",
    );
  const state = () => scalar<string>('SELECT state v FROM round_games WHERE round_id=$1', [round]);
  let guest = '';
  await t.test(
    'host adds an account and named guest without invitations or fake auth users',
    async () => {
      await asUser(a);
      assert.equal(await scalar<string>('SELECT add_round_player($1,$2) v', [round, b]), b);
      guest = await scalar<string>('SELECT add_round_player($1,null,$2) v', [round, 'Sam Guest']);
      assert.equal(
        await scalar<number>(
          "SELECT count(*)::int v FROM round_players WHERE round_id=$1 AND status='joined'",
          [round],
        ),
        3,
      );
      assert.equal(
        await scalar<number>('SELECT count(*)::int v FROM guest_players WHERE id=$1', [guest]),
        1,
      );
      await db.exec('RESET ROLE');
      assert.equal(await scalar<number>('SELECT count(*)::int v FROM auth.users'), 3);
      await asUser(out);
      await assert.rejects(
        db.query('SELECT add_round_player($1,$2)', [round, out]),
        /Only this group/,
      );
      await assert.rejects(
        db.query(
          'INSERT INTO round_holes(round_id,player_id,hole_number,score,par) VALUES($1,$2,1,4,4)',
          [round, a],
        ),
        /row-level security/,
      );
    },
  );
  await t.test(
    'host configures 50 Brass skins and finishes all three cards without any acceptance',
    async () => {
      await asUser(a);
      await db.query('SELECT save_skins_game($1,$2,$3,$4,$5)', [
        round,
        'gross',
        JSON.stringify({ [a]: 0, [b]: 0, [guest]: 0 }),
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        50,
      ]);
      await db.query('UPDATE rounds SET is_draft=false,invites_locked_at=now() WHERE id=$1', [
        round,
      ]);
      await assert.rejects(db.query('SELECT finish_group_round($1)', [round]), /Record every hole/);
      for (const [i, id] of [a, b, guest].entries())
        await db.query(
          'INSERT INTO round_holes(round_id,player_id,hole_number,score,par) SELECT $1,$2,n,$3,4 FROM generate_series(1,9)n',
          [round, id, 4 + i],
        );
      assert.equal(await balance(), 0);
      await db.query('SELECT finish_group_round($1)', [round]);
      assert.equal(await state(), 'settled');
      assert.equal(await balance(), 900);
      await db.query('SELECT finish_group_round($1)', [round]);
      assert.equal(await balance(), 900);
      assert.equal(
        await scalar<number>(
          "SELECT count(*)::int v FROM round_players WHERE round_id=$1 AND status='finished'",
          [round],
        ),
        3,
      );
      await assert.rejects(db.query('SELECT confirm_skins($1,1)', [round]), /permission denied/);
    },
  );
  await t.test(
    'one-way follower sees another account’s group scores without following the host',
    async () => {
      await asUser(out);
      await db.query('INSERT INTO follows(follower_id,following_id) VALUES($1,$2)', [out, b]);
      assert.equal(
        await scalar<number>(
          'SELECT total_score v FROM user_round_summaries WHERE round_id=$1 AND user_id=$2',
          [round, b],
        ),
        45,
      );
      const update = await db.query(
        'UPDATE round_holes SET score=20 WHERE round_id=$1 RETURNING id',
        [round],
      );
      assert.equal(update.rows.length, 0);
      await assert.rejects(db.query('SELECT finish_group_round($1)', [round]), /Only this group/);
    },
  );
  await t.test(
    'a group member edits anyone’s score; Brass recalculates and editor cannot be spoofed',
    async () => {
      await asUser(b);
      await db.query(
        'UPDATE round_holes SET score=7,edited_by=$3 WHERE round_id=$1 AND player_id=$2 AND hole_number=1',
        [round, a, a],
      );
      assert.equal(
        await scalar<string>(
          'SELECT edited_by v FROM round_holes WHERE round_id=$1 AND player_id=$2 AND hole_number=1',
          [round, a],
        ),
        b,
      );
      assert.equal(await state(), 'settled');
      await asUser(a);
      assert.equal(await balance(), 750);
      await db.query(
        'UPDATE round_holes SET edited_by=$3 WHERE round_id=$1 AND player_id=$2 AND hole_number=1',
        [round, a, a],
      );
      assert.equal(
        await scalar<string>(
          'SELECT edited_by v FROM round_holes WHERE round_id=$1 AND player_id=$2 AND hole_number=1',
          [round, a],
        ),
        b,
      );
      await db.query('SELECT save_skins_game($1,$2,$3,$4,$5)', [
        round,
        'gross',
        JSON.stringify({ [a]: 0, [b]: 0, [guest]: 0 }),
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        25,
      ]);
      assert.equal(await balance(), 375);
    },
  );
  await t.test(
    'closest-to-pin amounts are recorded literally and can be edited and deleted',
    async () => {
      await asUser(a);
      const id = await scalar<string>('SELECT save_side_game($1,$2,$3,$4,$5,$6) v', [
        round,
        a,
        guest,
        50,
        3,
        'Closest to pin',
      ]);
      assert.equal(await balance(), 325);
      await db.query('SELECT save_side_game($1,$2,$3,$4,$5,$6,$7)', [
        round,
        a,
        guest,
        20.5,
        3,
        'Closest to pin',
        id,
      ]);
      assert.equal(await balance(), 354.5);
      await asUser(out);
      await assert.rejects(db.query('SELECT delete_side_game($1)', [id]), /Only this group/);
      await assert.rejects(
        db.query('SELECT save_side_game($1,$2,$3,$4,$5,$6)', [
          round,
          a,
          guest,
          99,
          3,
          'Closest to pin',
        ]),
        /Only this group/,
      );
      await asUser(a);
      await db.query('SELECT delete_side_game($1)', [id]);
      assert.equal(await balance(), 375);
      await assert.rejects(
        db.query('SELECT save_side_game($1,$2,$3,$4,$5,$6)', [
          round,
          a,
          guest,
          -1,
          3,
          'Closest to pin',
        ]),
        /check constraint/,
      );
      await assert.rejects(
        db.query('SELECT save_side_game($1,$2,$3,$4,$5,$6)', [
          round,
          a,
          guest,
          50,
          18,
          'Closest to pin',
        ]),
        /Choose a hole/,
      );
    },
  );
  await t.test(
    'clearing and re-entering a score updates the ledger without asking others',
    async () => {
      await asUser(a);
      await db.query(
        'DELETE FROM round_holes WHERE round_id=$1 AND player_id=$2 AND hole_number=2',
        [round, b],
      );
      assert.equal(await state(), 'active');
      assert.equal(await balance(), 0);
      await db.query(
        'INSERT INTO round_holes(round_id,player_id,hole_number,score,par) VALUES($1,$2,2,5,4)',
        [round, b],
      );
      assert.equal(await state(), 'settled');
      assert.equal(await balance(), 375);
      await db.query('DELETE FROM round_players WHERE round_id=$1 AND user_id=$2', [round, guest]);
      assert.equal(await state(), 'settled');
      assert.equal(await balance(), 175);
    },
  );
  await t.test('deleted account attribution clears without blocking deletion', async () => {
    await db.exec('RESET ROLE');
    await db.query('DELETE FROM auth.users WHERE id=$1', [b]);
    await asUser(a);
    assert.equal(
      await scalar<string | null>(
        'SELECT edited_by v FROM round_holes WHERE round_id=$1 AND player_id=$2 AND hole_number=1',
        [round, a],
      ),
      null,
    );
  });
});
