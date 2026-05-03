import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { usePendingInvites } from '@/lib/queries/invites';
import { useAcceptInvite, useDeclineInvite } from '@/lib/queries/groupRounds';
import { useSession } from '@/lib/hooks/useSession';
import { palette, fontFamily } from '@/theme/linksman';

export default function Invites() {
  const { session } = useSession();
  const myId = session?.user.id;
  const q = usePendingInvites(myId);
  const accept = useAcceptInvite();
  const decline = useDeclineInvite();
  const invites = q.data ?? [];

  return (
    <ScreenContainer surface="bone">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View
          style={{
            paddingTop: 8,
            paddingBottom: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Wordmark size={20} color={palette.ink} />
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                letterSpacing: 11 * 0.16,
                color: palette.ink,
                opacity: 0.6,
                textTransform: 'uppercase',
              }}
            >
              BACK
            </Text>
          </Pressable>
        </View>

        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.2,
            color: palette.ink,
            opacity: 0.5,
            textTransform: 'uppercase',
            marginTop: 16,
          }}
        >
          PENDING
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 36,
            color: palette.ink,
            marginTop: 4,
          }}
        >
          Round invites
        </Text>

        {invites.length === 0 ? (
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              color: palette.ink,
              opacity: 0.55,
              marginTop: 24,
            }}
          >
            No pending invites.
          </Text>
        ) : (
          invites.map((inv) => (
            <View
              key={inv.round_id}
              style={{
                marginTop: 16,
                paddingVertical: 16,
                borderTopWidth: 0.5,
                borderColor: palette.ink + '33',
              }}
            >
              <Text style={{ fontFamily: fontFamily.display, fontSize: 18, color: palette.ink }}>
                {inv.inviter?.display_name ?? 'A friend'} invited you
              </Text>
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 11,
                  color: palette.ink,
                  opacity: 0.6,
                  marginTop: 4,
                }}
              >
                {inv.rounds.courses?.name ?? 'Course'} · {inv.rounds.played_at}
              </Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
                <Pressable
                  onPress={async () => {
                    if (!myId) return;
                    await accept.mutateAsync({ roundId: inv.round_id, userId: myId });
                    router.push(`/round/group/${inv.round_id}/lobby` as never);
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    backgroundColor: palette.fairway,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fontFamily.mono,
                      fontSize: 12,
                      letterSpacing: 12 * 0.16,
                      color: palette.bone,
                      textTransform: 'uppercase',
                    }}
                  >
                    ACCEPT
                  </Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (!myId) return;
                    await decline.mutateAsync({ roundId: inv.round_id, userId: myId });
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    borderWidth: 0.5,
                    borderColor: palette.ink + '33',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fontFamily.mono,
                      fontSize: 12,
                      letterSpacing: 12 * 0.16,
                      color: palette.ink,
                      textTransform: 'uppercase',
                    }}
                  >
                    DECLINE
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
