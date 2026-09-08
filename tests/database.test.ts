import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { URL } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

// Isolated PostgreSQL engine. Supabase's auth schema/roles are represented here;
// all repository migrations and real RLS policies execute, not mocked predicates.
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const host = uid(1),
  guest = uid(2),
  spectator = uid(3),
  outsider = uid(4);
const live = uid(101),
  privateRound = uid(102),
  solo = uid(103),
  course = uid(200);

test('database migrations enforce round authorization and atomic completion', async (t) => {
  const db = new PGlite({ extensions: { pg_trgm, pgcrypto } });
  t.after(() => db.close());
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
  `);
  const migrations = new URL('../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(migrations)).filter((name) => name.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL(name, migrations), 'utf8');
    await db.exec(sql);
  }
  await db.exec(`
    INSERT INTO auth.users VALUES ('${host}'), ('${guest}'), ('${spectator}'), ('${outsider}');
    INSERT INTO profiles(id, username, display_name) VALUES
      ('${host}', 'host', 'Host'), ('${guest}', 'guest', 'Guest'),
      ('${spectator}', 'spectator', 'Spectator'), ('${outsider}', 'outsider', 'Outsider');
    INSERT INTO courses(id,name,source,hole_count) VALUES ('${course}','Test course','osm',9);
    INSERT INTO rounds(id,user_id,course_id,is_group,is_draft,hole_count,visibility,live_visible) VALUES
      ('${live}','${host}','${course}',true,false,9,'mutuals',false),
      ('${privateRound}','${outsider}','${course}',true,false,9,'private',true),
      ('${solo}','${host}','${course}',false,true,9,'mutuals',false);
    INSERT INTO round_players(round_id,user_id,tee_box,status) VALUES
      ('${live}','${host}','default','joined'), ('${live}','${guest}','default','joined'),
      ('${privateRound}','${outsider}','default','joined'), ('${solo}','${host}','default','joined');
    INSERT INTO follows VALUES ('${spectator}','${host}',now()), ('${spectator}','${guest}',now());
    INSERT INTO round_holes(round_id,player_id,hole_number,score,par) VALUES ('${live}','${guest}',1,5,4);
  `);
  const asUser = async (id: string | null, role = 'authenticated') => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id ?? '']);
    await db.exec(`SET ROLE ${role}`);
  };
  const count = async (table: string, where: string) => {
    const result = await db.query<{ n: number }>(
      `SELECT count(*)::int n FROM ${table} WHERE ${where}`,
    );
    return result.rows[0]!.n;
  };

  await t.test('host can create a draft and return it before adding membership', async () => {
    await asUser(host);
    const result = await db.query<{ id: string }>(
      'INSERT INTO rounds(user_id,course_id,is_draft,hole_count,total_score,total_par) VALUES ($1,$2,true,9,0,0) RETURNING id',
      [host, course],
    );
    const id = result.rows[0]!.id;
    await db.query(
      "INSERT INTO round_players(round_id,user_id,tee_box,status) VALUES ($1,$2,'default','joined')",
      [id, host],
    );
    assert.equal(await count('round_players', `round_id='${id}'`), 1);
    await db.query('DELETE FROM rounds WHERE id=$1', [id]);
  });
  await t.test('anonymous and null-auth callers cannot force-end', async () => {
    await asUser(null, 'anon');
    await assert.rejects(db.query('SELECT force_end_round($1)', [live]), /permission denied/);
    await asUser(null);
    await assert.rejects(db.query('SELECT force_end_round($1)', [live]), /must be authenticated/);
  });
  await t.test('participant cannot move membership or scores into another round', async () => {
    await asUser(guest);
    await assert.rejects(
      db.query('UPDATE round_players SET round_id=$1 WHERE round_id=$2 AND user_id=$3', [
        privateRound,
        live,
        guest,
      ]),
      /identity cannot change/,
    );
    await assert.rejects(
      db.query('UPDATE round_holes SET round_id=$1 WHERE round_id=$2 AND player_id=$3', [
        privateRound,
        live,
        guest,
      ]),
      /identity cannot change/,
    );
    assert.equal(await count('round_players', `round_id='${privateRound}'`), 0);
  });
  await t.test('member can edit own score but host cannot overwrite it', async () => {
    await asUser(guest);
    await db.query('UPDATE round_holes SET score=6 WHERE round_id=$1 AND player_id=$2', [
      live,
      guest,
    ]);
    await asUser(host);
    const result = await db.query(
      'UPDATE round_holes SET score=9 WHERE round_id=$1 AND player_id=$2 RETURNING id',
      [live, guest],
    );
    assert.equal(result.rows.length, 0);
    assert.equal(await count('round_holes', `round_id='${live}' AND score=6`), 1);
  });
  await t.test('live-hidden scores and membership stay hidden from followers', async () => {
    await asUser(spectator);
    assert.equal(await count('rounds', `id='${live}'`), 0);
    assert.equal(await count('round_holes', `round_id='${live}'`), 0);
    assert.equal(await count('round_players', `round_id='${live}'`), 0);
    assert.equal(await count('user_round_summaries', `round_id='${live}'`), 0);
    await asUser(guest);
    assert.equal(await count('rounds', `id='${live}'`), 1);
  });
  await t.test('live-visible round respects both privacy and blocked participants', async () => {
    await asUser(host);
    await db.query('UPDATE rounds SET live_visible=true WHERE id=$1', [live]);
    await asUser(spectator);
    assert.equal(await count('round_holes', `round_id='${live}'`), 1);
    await asUser(host);
    await db.query("UPDATE rounds SET visibility='private' WHERE id=$1", [live]);
    await asUser(spectator);
    assert.equal(await count('rounds', `id='${live}'`), 0);
    await asUser(host);
    await db.query("UPDATE rounds SET visibility='mutuals' WHERE id=$1", [live]);
    await db.query('INSERT INTO blocks(blocker_id,blocked_id) VALUES ($1,$2)', [host, spectator]);
    await asUser(spectator);
    assert.equal(await count('rounds', `id='${live}'`), 0);
    await asUser(host);
    await db.query('DELETE FROM blocks WHERE blocker_id=$1', [host]);
    await db.query('UPDATE rounds SET live_visible=false WHERE id=$1', [live]);
  });
  await t.test('only host can force-end; completed hidden-live round becomes visible', async () => {
    await asUser(guest);
    await assert.rejects(db.query('SELECT force_end_round($1)', [live]), /only host/);
    await asUser(host);
    await db.query('SELECT force_end_round($1)', [live]);
    assert.equal(await count('round_players', `round_id='${live}' AND status='finished'`), 2);
    await asUser(spectator);
    assert.equal(await count('rounds', `id='${live}'`), 1);
  });
  await t.test(
    'one-way follower can read a finished guest result without following the host',
    async () => {
      await asUser(spectator);
      await db.query('DELETE FROM follows WHERE follower_id=$1 AND following_id=$2', [
        spectator,
        host,
      ]);
      const result = await db.query<{ total_score: number }>(
        "SELECT total_score FROM user_round_summaries WHERE round_id=$1 AND user_id=$2 AND player_status='finished'",
        [live, guest],
      );
      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0]!.total_score, 6);
      assert.equal(
        await count('follows', `follower_id='${guest}' AND following_id='${spectator}'`),
        0,
      );
    },
  );
  await t.test(
    'incomplete solo completion rolls back, then derives correct totals atomically',
    async () => {
      await asUser(host);
      await assert.rejects(
        db.query('UPDATE rounds SET is_draft=false WHERE id=$1', [solo]),
        /Record every hole/,
      );
      assert.equal(await count('rounds', `id='${solo}' AND is_draft`), 1);
      assert.equal(await count('round_players', `round_id='${solo}' AND status='joined'`), 1);
      await db.query(
        `INSERT INTO round_holes(round_id,player_id,hole_number,score,par)
      SELECT $1,$2,n,5,4 FROM generate_series(1,9) n`,
        [solo, host],
      );
      await db.query('UPDATE rounds SET is_draft=false,total_score=1,total_par=1 WHERE id=$1', [
        solo,
      ]);
      assert.equal(
        await count('rounds', `id='${solo}' AND total_score=45 AND total_par=36 AND NOT is_draft`),
        1,
      );
      assert.equal(
        await count(
          'user_round_summaries',
          `round_id='${solo}' AND player_status='finished' AND total_score=45`,
        ),
        1,
      );
    },
  );
  await t.test('completed join codes cannot add players or reset results', async () => {
    await asUser(host);
    await db.query("UPDATE rounds SET join_code='ABCDEF' WHERE id=$1", [live]);
    await asUser(outsider);
    await assert.rejects(
      db.query('SELECT redeem_join_code($1,$2)', ['ABCDEF', 'default']),
      /has finished/,
    );
    await asUser(guest);
    await db.query('SELECT redeem_join_code($1,$2)', ['ABCDEF', 'other']);
    await assert.rejects(
      db.query("UPDATE round_players SET status='joined' WHERE round_id=$1 AND user_id=$2", [
        live,
        guest,
      ]),
      /has finished/,
    );
    assert.equal(
      await count(
        'round_players',
        `round_id='${live}' AND user_id='${guest}' AND status='finished' AND tee_box='default'`,
      ),
      1,
    );
  });
  await t.test('deleting an inviter leaves other invitations intact', async () => {
    await db.exec('RESET ROLE');
    await db.query(
      `INSERT INTO round_players(round_id,user_id,tee_box,status,invited_by)
      VALUES ($1,$2,'default','invited',$3)`,
      [privateRound, spectator, guest],
    );
    await db.query('DELETE FROM auth.users WHERE id=$1', [guest]);
    assert.equal(await count('round_holes', `player_id='${guest}'`), 0);
    assert.equal(
      await count(
        'round_players',
        `round_id='${privateRound}' AND user_id='${spectator}' AND invited_by IS NULL`,
      ),
      1,
    );
  });
});
