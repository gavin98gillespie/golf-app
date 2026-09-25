import { isGameKind } from '@/lib/gameRules';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SideGamesPanel } from '@/components/SideGamesPanel';
import { useGroupRound } from '@/lib/queries/groupRounds';
import { useSession } from '@/lib/hooks/useSession';
import { SkinsGamePanel } from '@/components/SkinsGamePanel';
import { palette } from '@/theme/linksman';
export default function Game() {
  const scroll = useRef<ScrollView>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const { id, game } = useLocalSearchParams<{ id: string; game?: string }>();
  const selectedGame = isGameKind(game) ? game : undefined;
  const group = useGroupRound(id);
  const { session } = useSession();
  const canEdit =
    group.data?.round.user_id === session?.user.id ||
    !!group.data?.players.some(
      (p) => p.user_id === session?.user.id && ['joined', 'finished'].includes(p.status),
    );
  return (
    <ScreenContainer>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={{ minHeight: 48, justifyContent: 'center' }}
        >
          <Text style={{ color: palette.bone, fontSize: 16 }}>← Back</Text>
        </Pressable>
        {keyboardOpen && (
          <Pressable
            accessibilityRole="button"
            onPress={Keyboard.dismiss}
            style={{ minHeight: 48, minWidth: 56, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ color: palette.sage, fontSize: 17 }}>Done</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {selectedGame !== 'skins' && (
          <SideGamesPanel
            selectedGame={selectedGame}
            roundId={id}
            onFormChange={() => scroll.current?.scrollTo({ y: 0, animated: false })}
          />
        )}
        {(!selectedGame || selectedGame === 'skins') && (
          <SkinsGamePanel
            roundId={id}
            setup={
              group.data
                ? {
                    isHost: canEdit,
                    holeCount: group.data.round.hole_count ?? 18,
                    players: group.data.players,
                  }
                : undefined
            }
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
