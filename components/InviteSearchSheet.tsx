import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useSearchUsers } from '@/lib/queries/users';
import { useFollowersList, useFollowingList } from '@/lib/queries/follows';
import { palette, fontFamily } from '@/theme/linksman';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (userId: string) => void;
  myUserId: string | undefined;
  excludeIds: string[];
};

type Candidate = { id: string; display_name: string | null; username: string | null };

export function InviteSearchSheet({ visible, onClose, onPick, myUserId, excludeIds }: Props) {
  const [query, setQuery] = useState('');
  const followersQ = useFollowersList(myUserId);
  const followingQ = useFollowingList(myUserId);
  const searchQ = useSearchUsers(query, myUserId);

  const mutuals = useMemo<Candidate[]>(() => {
    const followerIds = new Set((followersQ.data ?? []).map((p) => p.id));
    return (followingQ.data ?? []).filter((p) => followerIds.has(p.id));
  }, [followersQ.data, followingQ.data]);

  const candidates: Candidate[] = (
    query.length >= 2
      ? ((searchQ.data ?? []) as Candidate[])
      : mutuals
  ).filter((u) => !excludeIds.includes(u.id) && u.id !== myUserId);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: palette.ink + 'CC' }} />
      <View
        style={{
          backgroundColor: palette.bone,
          padding: 24,
          paddingBottom: 48,
          maxHeight: '70%',
        }}
      >
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.2,
            color: palette.ink,
            opacity: 0.5,
            textTransform: 'uppercase',
          }}
        >
          INVITE A MUTUAL
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by username or name..."
          placeholderTextColor={palette.ink + '66'}
          autoCapitalize="none"
          style={{
            fontFamily: fontFamily.editorial,
            fontSize: 18,
            color: palette.ink,
            paddingVertical: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: palette.ink + '33',
            marginTop: 12,
          }}
        />
        {query.length > 0 && query.length < 2 ? (
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 10, color: palette.ink, opacity: 0.5, marginTop: 8 }}>
            Keep typing...
          </Text>
        ) : null}
        <ScrollView style={{ marginTop: 12 }} keyboardShouldPersistTaps="handled">
          {candidates.map((u) => (
            <Pressable
              key={u.id}
              onPress={() => {
                onPick(u.id);
                onClose();
              }}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 0.5,
                borderBottomColor: palette.ink + '20',
              }}
            >
              <Text style={{ fontFamily: fontFamily.display, fontSize: 18, color: palette.ink }}>
                {u.display_name ?? '—'}
              </Text>
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 11,
                  color: palette.ink,
                  opacity: 0.6,
                  marginTop: 2,
                }}
              >
                @{u.username ?? ''}
              </Text>
            </Pressable>
          ))}
          {candidates.length === 0 ? (
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                color: palette.ink,
                opacity: 0.55,
                marginTop: 16,
              }}
            >
              {query.length >= 2
                ? 'No matches.'
                : 'No mutuals yet. Search by username — the join code works for non-mutuals.'}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
