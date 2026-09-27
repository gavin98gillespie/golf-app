// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const auth = req.headers.get('authorization');
  if (!auth) {
    return new Response(JSON.stringify({ error: 'missing authorization' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  const jwt = auth.replace(/^Bearer\s+/i, '');

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  const userId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  // Storage-owned objects must be removed before deleting their auth owner.
  const { data: owned, error: photoErr } = await admin
    .from('round_photos')
    .select('storage_path')
    .eq('uploader_id', userId);
  if (photoErr)
    return new Response(
      JSON.stringify({ error: 'Could not remove account photos. Please retry.' }),
      { status: 500 },
    );
  // Include abandoned uploads which never received a metadata row.
  const { data: folders, error: folderError } = await admin.storage
    .from('round-photos')
    .list(userId, { limit: 1000 });
  if (folderError)
    return new Response(JSON.stringify({ error: 'Could not read account photos. Please retry.' }), {
      status: 500,
    });
  const paths = new Set((owned ?? []).map((p) => p.storage_path));
  for (const folder of folders ?? []) {
    let offset = 0;
    while (true) {
      const { data: files, error } = await admin.storage
        .from('round-photos')
        .list(`${userId}/${folder.name}`, { limit: 1000, offset });
      if (error)
        return new Response(
          JSON.stringify({ error: 'Could not read account photos. Please retry.' }),
          { status: 500 },
        );
      for (const f of files ?? []) paths.add(`${userId}/${folder.name}/${f.name}`);
      if (!files || files.length < 1000) break;
      offset += 1000;
    }
  }
  const allPaths = [...paths];
  for (let i = 0; i < allPaths.length; i += 100) {
    const { error } = await admin.storage.from('round-photos').remove(allPaths.slice(i, i + 100));
    if (error)
      return new Response(
        JSON.stringify({ error: 'Could not remove account photos. Please retry.' }),
        { status: 500 },
      );
  }
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
