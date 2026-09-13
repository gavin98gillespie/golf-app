import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { calculateSkins, type SkinsResult } from '../lib/games/skins';
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const a = uid(1),
  b = uid(2),
  outsider = uid(3),
  round = uid(100),
  course = uid(200);
test('legacy skins migration: consent, awards and revisions before the honor-system upgrade', async (t) => {
  const db = new PGlite({ extensions: { pg_trgm, pgcrypto } });
  t.after(() => db.close());
  await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
 ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;`);
  const path = new URL('../supabase/migrations/', import.meta.url);
  for (const f of (await readdir(path))
    .filter((f) => f.endsWith('.sql') && f < '20260914000001')
    .sort())
    await db.exec(await readFile(new URL(f, path), 'utf8'));
  await db.exec(`INSERT INTO auth.users VALUES('${a}'),('${b}'),('${outsider}'); INSERT INTO profiles(id,username,display_name) VALUES('${a}','player_a','A'),('${b}','player_b','B'),('${outsider}','player_c','C');
 INSERT INTO courses(id,name,source,hole_count) VALUES('${course}','Test','osm',9);
 INSERT INTO rounds(id,user_id,course_id,is_group,is_draft,hole_count) VALUES('${round}','${a}','${course}',true,true,9);
 INSERT INTO round_players(round_id,user_id,tee_box,status) VALUES('${round}','${a}','default','joined'),('${round}','${b}','default','joined');`);
  const asUser = async (id: string, role = 'authenticated') => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec(`SET ROLE ${role}`);
  };
  const game = async () =>
    (
      await db.query<{ g: { revision: number; state: string; result: SkinsResult } }>(
        'SELECT get_skins_game($1) g',
        [round],
      )
    ).rows[0]!.g;
  const ledger = async () =>
    (await db.query<{ l: unknown[] }>('SELECT get_my_brass_ledger() l')).rows[0]!.l;
  const config = () =>
    db.query('SELECT configure_skins($1,$2,$3,$4)', [
      round,
      'gross',
      JSON.stringify({ [a]: 0, [b]: 0 }),
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
    ]);
  const start = () =>
    db.query('UPDATE rounds SET is_draft=false,invites_locked_at=now() WHERE id=$1', [round]);
  await t.test('only host configures, only joined players consent, no direct awards', async () => {
    await asUser(b);
    await assert.rejects(config(), /Only the host/);
    await asUser(a);
    await config();
    await assert.rejects(
      db.query('UPDATE round_games SET state=$1', ['settled']),
      /permission denied/,
    );
    await assert.rejects(
      db.query('SELECT invalidate_skins($1,true)', [round]),
      /permission denied/,
    );
    await asUser(outsider);
    assert.equal(await game(), null);
    assert.deepEqual(await ledger(), []);
    await assert.rejects(db.query('SELECT accept_skins($1,1)', [round]), /Rules changed/);
    await asUser('', 'anon');
    await assert.rejects(db.query('SELECT get_skins_game($1)', [round]), /permission denied/);
  });
  await t.test('rules changes invalidate consent; no scores before everyone accepts', async () => {
    await asUser(a);
    await db.query('SELECT accept_skins($1,1)', [round]);
    await config();
    await assert.rejects(db.query('SELECT accept_skins($1,1)', [round]), /Rules changed/);
    await assert.rejects(start(), /Every joined player/);
    await assert.rejects(
      db.query(
        'INSERT INTO round_holes(round_id,player_id,hole_number,score,par) VALUES($1,$2,1,4,4)',
        [round, a],
      ),
      /Everyone must agree/,
    );
    const rev = (await game()).revision;
    await db.query('SELECT accept_skins($1,$2)', [round, rev]);
    await asUser(b);
    await db.query('SELECT accept_skins($1,$2)', [round, rev]);
    await asUser(a);
    await start();
    assert.equal((await game()).state, 'active');
    await assert.rejects(config(), /before starting/);
  });
  await t.test('missing scorecards cannot settle and SQL matches pure calculator', async () => {
    await asUser(a);
    await db.query(
      'INSERT INTO round_holes(round_id,player_id,hole_number,score,par) SELECT $1,$2,n,4,4 FROM generate_series(1,9)n',
      [round, a],
    );
    await assert.rejects(
      db.query('SELECT confirm_skins($1,$2)', [round, (await game()).revision]),
      /Every player/,
    );
    await db.query("UPDATE round_players SET status='finished' WHERE round_id=$1 AND user_id=$2", [
      round,
      a,
    ]);
    await asUser(b);
    await db.query(
      'INSERT INTO round_holes(round_id,player_id,hole_number,score,par) SELECT $1,$2,n,CASE WHEN n=1 THEN 4 ELSE 5 END,4 FROM generate_series(1,9)n',
      [round, b],
    );
    await db.query("UPDATE round_players SET status='finished' WHERE round_id=$1 AND user_id=$2", [
      round,
      b,
    ]);
    const actual = (await game()).result;
    const expected = calculateSkins({
      players: [
        { id: a, strokesReceived: 0 },
        { id: b, strokesReceived: 0 },
      ],
      holeCount: 9,
      mode: 'gross',
      scores: Array.from({ length: 9 }, (_, i) => [
        { playerId: a, hole: i + 1, strokes: 4 },
        { playerId: b, hole: i + 1, strokes: i === 0 ? 4 : 5 },
      ]).flat(),
    });
    // JSON serialization normalizes null-prototype maps and SQL JSON whitespace.
    const normalize = (r: SkinsResult) =>
      JSON.parse(
        JSON.stringify({
          ...r,
          transfers: r.transfers.map((v) => ({
            ...v,
            awardKey: JSON.stringify(JSON.parse(v.awardKey)),
          })),
        }),
      );
    assert.deepEqual(normalize(actual), normalize(expected));
    assert.deepEqual(await ledger(), []);
  });
  await t.test('all participants confirm same revision and retries never double-post', async () => {
    const rev = (await game()).revision;
    await db.query('SELECT confirm_skins($1,$2)', [round, rev]);
    assert.deepEqual(await ledger(), []);
    await asUser(a);
    await db.query('SELECT confirm_skins($1,$2)', [round, rev]);
    assert.equal((await game()).state, 'settled');
    assert.equal((await ledger()).length, 8);
    await db.query('SELECT confirm_skins($1,$2)', [round, rev]);
    assert.equal((await ledger()).length, 8);
    await asUser(outsider);
    assert.deepEqual(await ledger(), []);
    assert.equal((await db.query('SELECT * FROM brass_entries')).rows.length, 0);
  });
  await t.test(
    'correction reverses awards, rejects stale confirmation, and re-settles once',
    async () => {
      await asUser(a);
      const rev = (await game()).revision;
      await db.query(
        'UPDATE round_holes SET score=6 WHERE round_id=$1 AND player_id=$2 AND hole_number=2',
        [round, a],
      );
      assert.equal((await game()).state, 'active');
      assert.equal((await ledger()).length, 16);
      await assert.rejects(db.query('SELECT confirm_skins($1,$2)', [round, rev]), /result changed/);
      const next = (await game()).revision;
      await db.query('SELECT confirm_skins($1,$2)', [round, next]);
      await asUser(b);
      await db.query('SELECT confirm_skins($1,$2)', [round, next]);
      assert.equal((await game()).state, 'settled');
      assert.equal((await ledger()).length, 24);
    },
  );
  await t.test(
    'withdrawal voids rather than redistributing; audit survives account deletion',
    async () => {
      await asUser(b);
      await db.query(
        "UPDATE round_players SET status='withdrawn' WHERE round_id=$1 AND user_id=$2",
        [round, b],
      );
      assert.equal((await game()).state, 'void');
      assert.equal((await ledger()).length, 32);
      await assert.rejects(
        db.query('SELECT confirm_skins($1,$2)', [round, (await game()).revision]),
        /result changed/,
      );
      await db.exec('RESET ROLE');
      await db.query('DELETE FROM auth.users WHERE id=$1', [b]);
      await asUser(a);
      assert.equal((await ledger()).length, 32);
    },
  );
  await t.test('net server parity for 2–4 players across 9 and 18 holes', async () => {
    const ids = [uid(5), uid(6), uid(7), uid(8)];
    await db.exec('RESET ROLE');
    for (const id of ids) {
      await db.query('INSERT INTO auth.users VALUES($1)', [id]);
      await db.query('INSERT INTO profiles(id,username,display_name) VALUES($1,$2,$3)', [
        id,
        'player' + id.slice(-3),
        'Player',
      ]);
    }
    for (const count of [2, 3, 4]) {
      const rid = uid(110 + count);
      const holeCount = count === 3 ? 18 : 9;
      const order = Array.from({ length: holeCount }, (_, i) => holeCount - i);
      const players = ids.slice(0, count).map((id, i) => ({ id, strokesReceived: i * 7 }));
      await asUser(ids[0]!);
      await db.query(
        'INSERT INTO rounds(id,user_id,course_id,is_group,is_draft,hole_count) VALUES($1,$2,$3,true,true,$4)',
        [rid, ids[0], course, holeCount],
      );
      // Fixture invitations use admin; subsequent game actions use real participant roles.
      await db.exec('RESET ROLE');
      for (const p of players)
        await db.query(
          "INSERT INTO round_players(round_id,user_id,tee_box,status) VALUES($1,$2,'default','joined')",
          [rid, p.id],
        );
      await asUser(ids[0]!);
      const allowances = JSON.stringify(
        Object.fromEntries(players.map((p) => [p.id, p.strokesReceived])),
      );
      await assert.rejects(
        db.query('SELECT configure_skins($1,$2,$3,$4)', [rid, 'net', allowances, [1, 1]]),
        /hardest-to-easiest/,
      );
      await db.query('SELECT configure_skins($1,$2,$3,$4)', [rid, 'net', allowances, order]);
      for (const p of players) {
        await asUser(p.id);
        await db.query('SELECT accept_skins($1,1)', [rid]);
      }
      await asUser(ids[0]!);
      await db.query('UPDATE rounds SET is_draft=false,invites_locked_at=now() WHERE id=$1', [rid]);
      const scores = players.flatMap((p, i) =>
        Array.from({ length: holeCount }, (_, h) => ({
          playerId: p.id,
          hole: h + 1,
          strokes: 3 + ((h + i) % 4),
        })),
      );
      for (const score of scores) {
        await asUser(score.playerId);
        await db.query(
          'INSERT INTO round_holes(round_id,player_id,hole_number,score,par) VALUES($1,$2,$3,$4,4)',
          [rid, score.playerId, score.hole, score.strokes],
        );
      }
      const g = (
        await db.query<{ g: { result: SkinsResult } }>('SELECT get_skins_game($1) g', [rid])
      ).rows[0]!.g;
      const expected = calculateSkins({
        players,
        holeCount,
        mode: 'net',
        strokeOrder: order,
        scores,
      });
      const clean = (r: SkinsResult) =>
        JSON.parse(
          JSON.stringify({
            ...r,
            transfers: r.transfers.map((v) => ({
              ...v,
              awardKey: JSON.stringify(JSON.parse(v.awardKey)),
            })),
          }),
        );
      assert.deepEqual(clean(g.result), clean(expected));
      assert.equal(
        Object.values(g.result.balances).reduce((a, b) => a + b, 0),
        0,
      );
    }
  });
  await t.test(
    'a joined roster change invalidates acceptance and ties appear in ledger',
    async () => {
      const rid = uid(120),
        first = uid(5),
        second = uid(6),
        third = uid(7);
      await asUser(first);
      await db.query(
        'INSERT INTO rounds(id,user_id,course_id,is_group,is_draft,hole_count) VALUES($1,$2,$3,true,true,9)',
        [rid, first, course],
      );
      await db.exec('RESET ROLE');
      for (const p of [first, second])
        await db.query(
          "INSERT INTO round_players(round_id,user_id,tee_box,status) VALUES($1,$2,'default','joined')",
          [rid, p],
        );
      const configure = async (ids: string[]) =>
        db.query('SELECT configure_skins($1,$2,$3,$4)', [
          rid,
          'gross',
          JSON.stringify(Object.fromEntries(ids.map((id) => [id, 0]))),
          [1, 2, 3, 4, 5, 6, 7, 8, 9],
        ]);
      await asUser(first);
      await configure([first, second]);
      for (const id of [first, second]) {
        await asUser(id);
        await db.query('SELECT accept_skins($1,1)', [rid]);
      }
      await db.exec('RESET ROLE');
      await db.query(
        "INSERT INTO round_players(round_id,user_id,tee_box,status) VALUES($1,$2,'default','joined')",
        [rid, third],
      );
      await asUser(first);
      await assert.rejects(
        db.query('UPDATE rounds SET is_draft=false,invites_locked_at=now() WHERE id=$1', [rid]),
        /Every joined player/,
      );
      await configure([first, second, third]);
      const rev = (
        await db.query<{ r: number }>('SELECT revision r FROM round_games WHERE round_id=$1', [rid])
      ).rows[0]!.r;
      for (const id of [first, second, third]) {
        await asUser(id);
        await db.query('SELECT accept_skins($1,$2)', [rid, rev]);
      }
      await asUser(first);
      await db.query('UPDATE rounds SET is_draft=false,invites_locked_at=now() WHERE id=$1', [rid]);
      for (const id of [first, second, third]) {
        await asUser(id);
        await db.query(
          'INSERT INTO round_holes(round_id,player_id,hole_number,score,par) SELECT $1,$2,n,4,4 FROM generate_series(1,9)n',
          [rid, id],
        );
        await db.query(
          "UPDATE round_players SET status='finished' WHERE round_id=$1 AND user_id=$2",
          [rid, id],
        );
      }
      const final = (
        await db.query<{ r: number }>('SELECT revision r FROM round_games WHERE round_id=$1', [rid])
      ).rows[0]!.r;
      for (const id of [first, second, third]) {
        await asUser(id);
        await db.query('SELECT confirm_skins($1,$2)', [rid, final]);
      }
      const entries = (await ledger()) as { round_id: string; change: number }[];
      const ties = entries.filter((e) => e.round_id === rid);
      assert.equal(ties.length, 2);
      assert.ok(ties.every((e) => e.change === 0));
    },
  );
});
