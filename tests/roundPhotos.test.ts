import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { photoSlot, photoResize } from '../lib/photos/model';
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const a = uid(1),
  b = uid(2),
  out = uid(3),
  round = uid(10),
  course = uid(20);
test('photo slots and compression dimensions', () => {
  assert.equal(photoSlot({ roundId: round, kind: 'group' }), 'group');
  assert.equal(photoSlot({ roundId: round, kind: 'ace', playerId: a, hole: 7 }), `${a}:7`);
  assert.throws(() => photoSlot({ roundId: round, kind: 'ace', playerId: a, hole: 0 }));
  assert.deepEqual(photoResize(4000, 3000), { width: 1600, height: 1200 });
  assert.deepEqual(photoResize(1000, 2000), { width: 800, height: 1600 });
  assert.deepEqual(photoResize(800, 600), { width: 800, height: 600 });
});
test('photo lifecycle enforces scoring, visibility, storage authorization and cleanup', async (t) => {
  const db = new PGlite({ extensions: { pg_trgm, pgcrypto } });
  t.after(() => db.close());
  await db.exec(`CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,raw_user_meta_data jsonb DEFAULT '{}'::jsonb);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
 CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT USAGE ON SCHEMA storage TO authenticated;GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;`);
  const root = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(root)).filter((f) => f.endsWith('.sql')).sort())
    await db.exec(await readFile(new URL(file, root), 'utf8'));
  await db.exec(
    `INSERT INTO auth.users(id)VALUES('${a}'),('${b}'),('${out}');INSERT INTO profiles(id,username,display_name)VALUES('${a}','photo_host','Host'),('${b}','photo_player','Player'),('${out}','photo_out','Outsider');INSERT INTO courses(id,name,source,hole_count)VALUES('${course}','Photo fixture','osm',9);INSERT INTO rounds(id,user_id,course_id,is_group,is_draft,hole_count,visibility)VALUES('${round}','${a}','${course}',true,false,9,'private');INSERT INTO round_players(round_id,user_id,status,tee_box)VALUES('${round}','${a}','joined','default'),('${round}','${b}','joined','default');`,
  );
  const as = async (id: string) => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec('SET ROLE authenticated');
  };
  const path = (name: string) => `${a}/${round}/${name}.jpg`;
  const insert = (kind: string, player: string | null, hole: number | null, name: string) =>
    db.query(
      'INSERT INTO round_photos(round_id,uploader_id,kind,player_id,hole_number,storage_path)VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
      [round, a, kind, player, hole, path(name)],
    );
  await as(a);
  await assert.rejects(insert('ace', a, 7, 'before'), /Save a hole in one/);
  await assert.rejects(insert('group', null, null, 'early-group'), /finish the group/);
  await db.query(
    'INSERT INTO round_holes(round_id,player_id,hole_number,score,par)VALUES($1,$2,7,1,3)',
    [round, a],
  );
  const photo = await insert('ace', a, 7, 'ace');
  const id = (photo.rows[0] as { id: string }).id;
  await db.query("INSERT INTO storage.objects(bucket_id,name)VALUES('round-photos',$1)", [
    path('ace'),
  ]);
  await assert.rejects(insert('ace', a, 7, 'duplicate'), /unique constraint/);
  await assert.rejects(
    db.query('UPDATE round_photos SET hole_number=8 WHERE id=$1', [id]),
    /identity cannot change/,
  );
  await as(b);
  assert.equal((await db.query('SELECT * FROM round_photos')).rows.length, 1);
  assert.equal((await db.query('DELETE FROM round_photos RETURNING id')).rows.length, 0);
  await as(out);
  assert.equal(
    (
      await db.query<{ allowed: boolean }>("SELECT photo_eligible($1,'ace',$2,7) allowed", [
        round,
        a,
      ])
    ).rows[0]?.allowed,
    false,
  );
  assert.equal((await db.query('SELECT * FROM round_photos')).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length, 0);
  await assert.rejects(
    db.query("INSERT INTO storage.objects(bucket_id,name)VALUES('round-photos',$1)", [
      `${out}/${round}/unauthorized.jpg`,
    ]),
    /row-level security/,
  );
  await as(a);
  await db.query("UPDATE rounds SET visibility='mutuals',live_visible=true WHERE id=$1", [round]);
  await as(out);
  await db.query('INSERT INTO follows(follower_id,following_id)VALUES($1,$2)', [out, b]);
  assert.equal((await db.query('SELECT * FROM round_photos')).rows.length, 1);
  assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length, 1);
  await db.query('INSERT INTO blocks(blocker_id,blocked_id)VALUES($1,$2)', [out, a]);
  assert.equal((await db.query('SELECT * FROM round_photos')).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length, 0);
  await as(a);
  assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length, 1);
  await db.query('UPDATE round_photos SET storage_path=$1 WHERE id=$2', [path('replacement'), id]);
  await db.query('UPDATE round_holes SET score=2 WHERE round_id=$1', [round]);
  assert.equal((await db.query('SELECT * FROM round_photos')).rows.length, 0);
  await db.query("UPDATE round_players SET status='finished' WHERE round_id=$1", [round]);
  await insert('group', null, null, 'group');
  await assert.rejects(insert('group', null, null, 'other-group'), /unique constraint/);
  assert.equal((await db.query('SELECT * FROM profile_round_photos($1)', [a])).rows.length, 1);
  assert.equal((await db.query('SELECT * FROM profile_round_photos($1)', [b])).rows.length, 1);
  await as(out);
  assert.equal((await db.query('SELECT * FROM profile_round_photos($1)', [b])).rows.length, 0);
  await as(a);
  await db.query('DELETE FROM round_photos WHERE kind=$1', ['group']);
  await db.exec('RESET ROLE');
  assert.equal((await db.query('SELECT * FROM photo_cleanup_queue')).rows.length, 3);
  assert.equal(
    (await db.query<{ public: boolean }>('SELECT public FROM storage.buckets')).rows[0]?.public,
    false,
  );
});
