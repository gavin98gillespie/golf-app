import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.1';
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Content-Type': 'application/json',
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return new Response('{}', { status: 405, headers });
  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);
  if (authError || !user) return new Response('{}', { status: 401, headers });
  try {
    const body = await req.json().catch(() => ({}));
    const abandoned = Array.isArray(body.paths)
      ? body.paths
          .filter(
            (p: unknown): p is string =>
              typeof p === 'string' && p.startsWith(user.id + '/') && p.length < 200,
          )
          .slice(0, 10)
      : [];
    const { data: queued, error } = await admin
      .from('photo_cleanup_queue')
      .select('storage_path')
      .order('created_at')
      .limit(100);
    if (error) throw error;
    const candidates = [...new Set([...abandoned, ...(queued ?? []).map((p) => p.storage_path)])];
    if (!candidates.length) return new Response('{"removed":0}', { headers });
    const { data: refs, error: refError } = await admin
      .from('round_photos')
      .select('storage_path')
      .in('storage_path', candidates);
    if (refError) throw refError;
    const referenced = new Set((refs ?? []).map((p) => p.storage_path));
    const paths = candidates.filter((p) => !referenced.has(p));
    if (paths.length) {
      const { error: removeError } = await admin.storage.from('round-photos').remove(paths);
      if (removeError) throw removeError;
      const { error: queueError } = await admin
        .from('photo_cleanup_queue')
        .delete()
        .in('storage_path', paths);
      if (queueError) throw queueError;
    }
    return new Response(JSON.stringify({ removed: paths.length }), { headers });
  } catch {
    return new Response(JSON.stringify({ error: 'Photo cleanup will retry.' }), {
      status: 500,
      headers,
    });
  }
});
