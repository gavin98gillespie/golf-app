import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SearchField } from '@/components/SearchField';
import { Wordmark } from '@/components/Wordmark';
import { FeedRoundCard } from '@/components/FeedRoundCard';
import { GroupRoundCard } from '@/components/GroupRoundCard';
import { CourseListItem } from '@/components/CourseListItem';
import { UserListItem } from '@/components/UserListItem';
import { useSession } from '@/lib/hooks/useSession';
import { useFeed } from '@/lib/queries/feed';
import { useSearchUsers } from '@/lib/queries/users';
import { useCourseSearch } from '@/lib/queries/courses';
import { supabase } from '@/lib/supabase';
import { palette, fontFamily } from '@/theme/linksman';

export default function Home() {
  const { session } = useSession();
  const userId = session?.user.id;
  const params = useLocalSearchParams<{ search?: string }>();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const feedQ = useFeed(userId);
  const usersQ = useSearchUsers(debounced, userId);
  const coursesQ = useCourseSearch(debounced);
  const searching = query.trim().length > 0;
  const waiting = query.trim() !== debounced;
  const activeQ = useQuery({
    queryKey: ['rounds', 'inProgress', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('round_players')
        .select(
          'round_id, rounds!inner(id,is_group,is_draft,invites_locked_at,hole_count,courses(name),round_holes(hole_number,player_id))',
        )
        .eq('user_id', userId!)
        .eq('status', 'joined')
        .order('joined_at', { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((p) => p.rounds)
        .filter((r) => r && (r.is_group || r.is_draft))
        .map((r) => {
          const scored = new Set(
            r.round_holes.filter((h) => h.player_id === userId).map((h) => h.hole_number),
          );
          const count = r.hole_count ?? 18;
          let resumeHole = 1;
          while (resumeHole < count && scored.has(resumeHole)) resumeHole++;
          return { ...r, resumeHole };
        });
    },
  });
  return (
    <ScreenContainer>
      <View style={{ paddingVertical: 12 }}>
        <Wordmark size={24} color={palette.bone} />
      </View>
      <SearchField
        accessibilityLabel="Find golfers or courses"
        value={query}
        onChangeText={setQuery}
        autoFocus={params.search === '1'}
        placeholder="Find golfers or courses"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={{
          fontSize: 17,
          color: palette.bone,
          backgroundColor: palette.bone + '0D',
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      />
      {searching ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 8,
            }}
          >
            <Text style={styles.muted}>Search results</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setQuery('');
                Keyboard.dismiss();
              }}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: palette.sage, fontSize: 16 }}>Back to rounds</Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {query.trim().length < 2 ? (
              <Text style={styles.muted}>Enter at least two characters.</Text>
            ) : (
              <>
                <Text style={styles.section}>Golfers</Text>
                {waiting || usersQ.isLoading ? (
                  <ActivityIndicator color={palette.sage} />
                ) : usersQ.isError ? (
                  <Retry
                    message="Could not search golfers."
                    onPress={() => void usersQ.refetch()}
                  />
                ) : usersQ.data?.length ? (
                  usersQ.data.map((u) => <UserListItem key={u.id} user={u} viewerId={userId!} />)
                ) : (
                  <Text style={styles.muted}>No golfers found.</Text>
                )}
                <Text style={styles.section}>Courses</Text>
                {waiting || coursesQ.isLoading ? (
                  <ActivityIndicator color={palette.sage} />
                ) : coursesQ.isError ? (
                  <Retry
                    message="Could not search courses."
                    onPress={() => void coursesQ.refetch()}
                  />
                ) : coursesQ.data?.length ? (
                  coursesQ.data.map((c) => (
                    <CourseListItem
                      key={c.id}
                      course={c}
                      onPress={() => {
                        Keyboard.dismiss();
                        router.push({ pathname: '/course/[id]', params: { id: c.id } });
                      }}
                    />
                  ))
                ) : (
                  <Text style={styles.muted}>No courses found.</Text>
                )}
              </>
            )}
          </ScrollView>
        </>
      ) : (
        <FlatList
          data={feedQ.data ?? []}
          keyExtractor={(r) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            try {
              await Promise.all([feedQ.refetch(), activeQ.refetch()]);
            } finally {
              setRefreshing(false);
            }
          }}
          ListHeaderComponent={
            <View>
              {(activeQ.data ?? []).map((round) => (
                <Pressable
                  key={round.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(
                      round.is_group
                        ? {
                            pathname: round.invites_locked_at
                              ? '/round/group/[id]/score'
                              : '/round/group/[id]/lobby',
                            params: { id: round.id },
                          }
                        : {
                            pathname: '/round/new/score',
                            params: { roundId: round.id, hole: String(round.resumeHole) },
                          },
                    )
                  }
                  style={{
                    paddingVertical: 16,
                    borderBottomWidth: 0.5,
                    borderBottomColor: palette.bone + '33',
                  }}
                >
                  <Text style={{ fontSize: 14, color: palette.brass }}>
                    Continue {round.is_group ? 'group ' : ''}round →
                  </Text>
                  <Text style={{ fontSize: 18, color: palette.bone, marginTop: 5 }}>
                    {round.courses?.name ?? 'Your round'}
                  </Text>
                </Pressable>
              ))}
              {activeQ.isError ? (
                <Retry
                  message="Could not load unfinished rounds."
                  onPress={() => void activeQ.refetch()}
                />
              ) : null}
              <Text style={styles.section}>On the course</Text>
            </View>
          }
          renderItem={({ item }) =>
            userId ? (
              item.is_group ? (
                <GroupRoundCard round={item} viewerId={userId} />
              ) : (
                <FeedRoundCard round={item} viewerId={userId} />
              )
            ) : null
          }
          ListEmptyComponent={
            feedQ.isLoading ? (
              <ActivityIndicator color={palette.sage} />
            ) : feedQ.isError ? (
              <Retry message="Could not load rounds." onPress={() => void feedQ.refetch()} />
            ) : (
              <View style={{ paddingVertical: 20 }}>
                <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: palette.bone }}>
                  Your golf starts here.
                </Text>
                <Text style={[styles.muted, { marginTop: 10, lineHeight: 24 }]}>
                  Find golfers using the search bar above. Follow them to see their shared rounds—no
                  follow-back needed.
                </Text>
                <Text style={[styles.muted, { marginTop: 16 }]}>
                  Ready to play? Tap New round below.
                </Text>
              </View>
            )
          }
        />
      )}
    </ScreenContainer>
  );
}
function Retry({ message, onPress }: { message: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ paddingVertical: 16 }}>
      <Text style={styles.muted}>{message} Tap to retry.</Text>
    </Pressable>
  );
}
const styles = {
  section: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    color: palette.bone,
    marginTop: 24,
    marginBottom: 12,
  },
  muted: { fontSize: 16, color: palette.sage },
};
