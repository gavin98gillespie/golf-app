import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, type Tables } from '@/lib/supabase';
import { useSession } from '@/lib/hooks/useSession';
import { photoSlot, type PhotoTarget } from '@/lib/photos/model';
export type RoundPhoto = Tables<'round_photos'>;
export function useRoundPhotos(roundId: string) {
  const { session } = useSession();
  return useQuery({
    queryKey: ['roundPhotos', session?.user.id, roundId],
    enabled: !!session && !!roundId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('round_photos')
        .select('*')
        .eq('round_id', roundId)
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}
export function usePhotoUrl(photo: RoundPhoto) {
  const { session } = useSession();
  return useQuery({
    queryKey: ['photoUrl', session?.user.id, photo.storage_path],
    staleTime: 240000,
    refetchInterval: 240000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('round-photos')
        .createSignedUrl(photo.storage_path, 300);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
export function useProfilePhotos(userId: string | undefined) {
  const { session } = useSession();
  return useQuery({
    queryKey: ['profilePhotos', session?.user.id, userId, 'highlights'],
    enabled: !!userId && !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('profile_round_photos', { p_user: userId! });
      if (error) throw error;
      if (!data.length) return [];
      // The RPC limits this to 30 photos; batch their round context into one read.
      const { data: rounds, error: roundError } = await supabase
        .from('rounds')
        .select('id, played_at, courses(name, city, state)')
        .in('id', [...new Set(data.map((photo) => photo.round_id))]);
      if (roundError) throw roundError;
      return data
        .map((photo) => ({
          ...photo,
          round: rounds.find((round) => round.id === photo.round_id) ?? null,
        }))
        .sort(
          (a, b) =>
            (b.round?.played_at ?? '').localeCompare(a.round?.played_at ?? '') ||
            b.created_at.localeCompare(a.created_at),
        );
    },
  });
}
export async function cleanupPhotos(paths: string[] = []) {
  // A durable server-side queue retries deletes after connectivity failures.
  await supabase.functions.invoke('cleanup-round-photos', { body: { paths } }).catch(() => {});
}
export function usePhotoActions() {
  const qc = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['roundPhotos'] }),
      qc.invalidateQueries({ queryKey: ['profilePhotos'] }),
      qc.invalidateQueries({ queryKey: ['photoUrl'] }),
    ]);
  };
  return {
    upload: async (target: PhotoTarget, bytes: ArrayBuffer, existing?: RoundPhoto) => {
      photoSlot(target);
      if (bytes.byteLength > 5 * 1024 * 1024)
        throw new Error('This photo is too large. Please choose another.');
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Sign in again to add a photo.');
      const path = `${user.id}/${target.roundId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('round-photos')
        .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) {
        void cleanupPhotos([path]);
        throw uploadError;
      }
      const record = {
        round_id: target.roundId,
        uploader_id: user.id,
        kind: target.kind,
        player_id: target.playerId ?? null,
        hole_number: target.hole ?? null,
        storage_path: path,
      };
      const write = existing
        ? supabase
            .from('round_photos')
            .update({ storage_path: path })
            .eq('id', existing.id)
            .select()
            .single()
        : supabase.from('round_photos').insert(record).select().single();
      const { error } = await write;
      if (error) {
        void cleanupPhotos([path]);
        throw new Error(
          error.code === '23505'
            ? 'Someone has already added this photo. Refresh the round to see it.'
            : error.message,
        );
      }
      await refresh();
      void cleanupPhotos();
    },
    remove: async (photo: RoundPhoto) => {
      const { error } = await supabase
        .from('round_photos')
        .delete()
        .eq('id', photo.id)
        .select()
        .single();
      if (error) throw error;
      await refresh();
      void cleanupPhotos();
    },
  };
}
