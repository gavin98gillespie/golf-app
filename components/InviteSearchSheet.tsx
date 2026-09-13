import { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useSearchUsers } from '@/lib/queries/users';
import { useFollowingList } from '@/lib/queries/follows';
import { SearchField } from '@/components/SearchField';
import { supabase } from '@/lib/supabase';
import { palette, fontFamily } from '@/theme/linksman';
type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (userId: string) => void | Promise<void>;
  onGuest?: (name: string) => Promise<void>;
  myUserId: string | undefined;
  excludeIds: string[];
};
export function InviteSearchSheet({
  visible,
  onClose,
  onPick,
  onGuest,
  myUserId,
  excludeIds,
}: Props) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const following = useFollowingList(myUserId);
  const search = useSearchUsers(query, myUserId);
  const guests = useQuery({
    queryKey: ['myGuests', myUserId],
    enabled: visible && !!myUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guest_players')
        .select('id,display_name')
        .eq('owner_id', myUserId!);
      if (error) throw error;
      return data ?? [];
    },
  });
  const candidates = (
    query.trim().length >= 2 ? (search.data ?? []) : (following.data ?? [])
  ).filter((p) => !excludeIds.includes(p.id) && p.id !== myUserId);
  const knownGuests = (guests.data ?? []).filter(
    (p) => !excludeIds.includes(p.id) && p.display_name.toLowerCase().includes(query.toLowerCase()),
  );
  const pick = async (work: () => void | Promise<void>) => {
    setBusy(true);
    try {
      await work();
      Keyboard.dismiss();
      setQuery('');
      onClose();
    } catch (e) {
      Alert.alert('Could not add player', (e as { message?: string }).message ?? 'Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bone }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ paddingHorizontal: 24 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 17, color: palette.fairway }}>Close</Text>
            </Pressable>
            <Text style={{ fontFamily: fontFamily.display, fontSize: 32, color: palette.ink }}>
              Add players
            </Text>
            <Text style={{ fontSize: 16, lineHeight: 24, color: palette.ink, marginVertical: 8 }}>
              Choose an account or enter a guest’s name. Nobody else needs to log in.
            </Text>
            <SearchField
              surface="bone"
              accessibilityLabel="Search players or enter guest name"
              value={query}
              onChangeText={setQuery}
              placeholder="Name or username"
              autoCapitalize="none"
              style={{
                fontSize: 18,
                color: palette.ink,
                borderBottomWidth: 1,
                borderColor: palette.ink + '33',
              }}
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
          >
            {onGuest && query.trim().length > 0 && (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void pick(() => onGuest(query.trim()))}
                style={{ padding: 16, backgroundColor: palette.fairway, marginBottom: 16 }}
              >
                <Text style={{ fontSize: 17, color: palette.bone }}>
                  Add “{query.trim()}” as a guest
                </Text>
              </Pressable>
            )}
            {busy && <Text style={{ fontSize: 16, color: palette.ink }}>Adding player…</Text>}
            {candidates.map((p) => (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                key={p.id}
                onPress={() => void pick(() => onPick(p.id))}
                style={{
                  paddingVertical: 16,
                  borderBottomWidth: 0.5,
                  borderColor: palette.ink + '33',
                }}
              >
                <Text style={{ fontSize: 19, color: palette.ink }}>
                  {p.display_name ?? p.username}
                </Text>
                <Text style={{ fontSize: 15, color: palette.fairway }}>@{p.username}</Text>
              </Pressable>
            ))}
            {knownGuests.map((p) => (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                key={p.id}
                onPress={() => void pick(() => onPick(p.id))}
                style={{
                  paddingVertical: 16,
                  borderBottomWidth: 0.5,
                  borderColor: palette.ink + '33',
                }}
              >
                <Text style={{ fontSize: 19, color: palette.ink }}>{p.display_name}</Text>
                <Text style={{ fontSize: 15, color: palette.fairway }}>Saved guest</Text>
              </Pressable>
            ))}
            {candidates.length === 0 && knownGuests.length === 0 && (
              <Text style={{ fontSize: 16, lineHeight: 24, color: palette.ink, marginTop: 16 }}>
                {query.length >= 2
                  ? 'No matching accounts. You can add a guest above.'
                  : 'Search for a player, or type a name to add a guest.'}
              </Text>
            )}
            {(search.isError || following.isError || guests.isError) && (
              <Pressable
                onPress={() => {
                  void search.refetch();
                  void following.refetch();
                  void guests.refetch();
                }}
                style={{ minHeight: 48, justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 16, color: palette.clay }}>
                  Could not load some players. Tap to retry.
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
