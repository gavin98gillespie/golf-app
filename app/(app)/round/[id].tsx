import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { ScreenContainer } from '@/components/ScreenContainer';
import { HoleScoreGrid } from '@/components/HoleScoreGrid';
import { useRoundHoles } from '@/lib/queries/rounds';
import { useSession } from '@/lib/hooks/useSession';
import { supabase, type Tables } from '@/lib/supabase';

type RoundWithCourse = Tables<'rounds'> & {
  courses: Pick<Tables<'courses'>, 'name' | 'hole_count' | 'city' | 'state'> | null;
};

export default function RoundDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();

  const roundQ = useQuery({
    queryKey: ['round', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('rounds')
        .select('*, courses(name, hole_count, city, state)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as RoundWithCourse;
    },
    enabled: !!id,
  });

  const holesQ = useRoundHoles(id);

  const round = roundQ.data;
  const isOwner = !!session?.user.id && round?.user_id === session.user.id;

  const totals = useMemo(() => {
    const scored = holesQ.data ?? [];
    const score = scored.reduce((a, h) => a + h.score, 0);
    const par = scored.reduce((a, h) => a + h.par, 0);
    return { score, par, diff: score - par };
  }, [holesQ.data]);

  if (!round) {
    return (
      <ScreenContainer>
        <Text className="text-text-secondary mt-12">Loading...</Text>
      </ScreenContainer>
    );
  }

  const totalHoles = round.courses?.hole_count ?? 18;
  const dateStr = format(new Date(round.played_at), 'MMMM d, yyyy');

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.back()} className="mt-4 mb-2">
        <Text className="text-text-secondary text-sm">← Back</Text>
      </Pressable>

      {!isOwner && round.user_id ? <RoundOwnerHeader ownerId={round.user_id} /> : null}

      <Text className="text-text-secondary text-xs uppercase tracking-wider mt-2">{dateStr}</Text>
      <Pressable
        onPress={() => (round.course_id ? router.push(`/course/${round.course_id}`) : undefined)}
        className="active:opacity-70"
      >
        <Text className="text-text-primary text-3xl font-light mt-1 mb-1">
          {round.courses?.name ?? 'Round'}
        </Text>
        <Text className="text-accent text-xs uppercase tracking-wider mb-4">View course →</Text>
      </Pressable>

      <View className="bg-bg-surface border border-border-subtle rounded-2xl p-5 mb-4">
        <Text
          style={{ fontSize: 64 }}
          className="text-accent font-light tracking-tight leading-none"
        >
          {totals.score}
        </Text>
        <Text className="text-text-secondary text-sm mt-2">
          {totals.diff >= 0 ? `+${totals.diff}` : totals.diff} · {totalHoles} holes · Par{' '}
          {totals.par}
        </Text>
      </View>

      <View className="bg-bg-surface border border-border-subtle rounded-2xl p-4 mb-4">
        <Text className="text-text-secondary text-xs uppercase tracking-wider mb-3">Holes</Text>
        <HoleScoreGrid holes={holesQ.data ?? []} totalHoles={totalHoles} />
      </View>
    </ScreenContainer>
  );
}

function RoundOwnerHeader({ ownerId }: { ownerId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['profile', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .eq('id', ownerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (isLoading || !data) return null;
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/profile/[username]', params: { username: data.username } })
      }
      className="flex-row items-center py-3 active:opacity-70"
    >
      <View className="w-10 h-10 rounded-full bg-bg-surface border border-border-subtle items-center justify-center">
        <Text className="text-text-secondary text-base font-semibold">
          {data.display_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="ml-3">
        <Text className="text-text-primary text-base font-semibold">{data.display_name}</Text>
        <Text className="text-text-secondary text-xs">@{data.username}</Text>
      </View>
    </Pressable>
  );
}
