import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrassAmount } from '@/components/BrassAmount';
import { GameEmblem } from '@/components/GameEmblem';
import { GameRulesContent } from '@/components/GameRulesSheet';
import { SkinsGamePanel } from '@/components/SkinsGamePanel';
import { SideGamesPanel } from '@/components/SideGamesPanel';
import { GAME_RULES, type GameKind } from '@/lib/gameRules';
import { useSkinsGame } from '@/lib/queries/skins';
import { useSideGames } from '@/lib/queries/sideGames';
import { roundBrassBalance } from '@/lib/games/roundBrass';
import { useSession } from '@/lib/hooks/useSession';
import type { GroupRoundPlayer } from '@/lib/queries/groupRounds';
import { fontFamily, palette } from '@/theme/linksman';

export function RoundBrass({ roundId, finished = false }: { roundId: string; finished?: boolean }) {
  const { session } = useSession();
  const skins = useSkinsGame(roundId);
  const side = useSideGames(roundId);
  if (!session || skins.isPending || side.isPending) return null;
  if (skins.isError || side.isError)
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void skins.refetch();
          void side.refetch();
        }}
        style={s.summary}
      >
        <Text style={s.detail}>Brass unavailable · tap to retry</Text>
      </Pressable>
    );
  if ((!skins.data || skins.data.state === 'void') && !side.data?.length) return null;
  const amount = roundBrassBalance(
    session.user.id,
    skins.data?.state === 'void' ? undefined : skins.data?.result?.balances,
    side.data ?? [],
  );
  return (
    <View
      style={[
        s.summary,
        finished && {
          backgroundColor: palette.bone,
          borderRadius: 8,
          borderTopWidth: 4,
          borderTopColor: palette.brass,
          padding: 22,
          marginVertical: 18,
        },
      ]}
    >
      <Text style={[s.label, finished && { color: palette.fairway, fontSize: 12 }]}>
        {finished ? 'YOUR ROUND RESULT' : 'YOUR ROUND · LIVE BRASS'}
      </Text>
      <BrassAmount amount={amount} signed size={finished ? 48 : 34} light={finished} />
      <Text style={[s.detail, finished && { color: palette.fairway }]}>
        {amount > 0
          ? `You ${finished ? 'made' : 'are up'} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} Brass`
          : amount < 0
            ? `You are down ${Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} Brass`
            : 'All square'}{' '}
        · {finished ? 'net result' : 'updates as you play'}
      </Text>
    </View>
  );
}

export function RoundGames({
  roundId,
  players,
  canEdit,
  holeCount,
  hole = 1,
  lobby = false,
  initialGame,
  autoOpen = false,
  onSelect,
  beforeOpen,
  overview = false,
}: {
  roundId: string;
  players: GroupRoundPlayer[];
  canEdit: boolean;
  holeCount: number;
  hole?: number;
  lobby?: boolean;
  initialGame?: GameKind | undefined;
  autoOpen?: boolean;
  onSelect?: (game: GameKind) => void;
  beforeOpen?: () => Promise<boolean>;
  overview?: boolean;
}) {
  const [selected, setSelected] = useState<GameKind | null>(
    autoOpen && !lobby ? (initialGame ?? null) : null,
  );
  const [preferred, setPreferred] = useState<GameKind | undefined>(initialGame);
  const skins = useSkinsGame(roundId);
  const side = useSideGames(roundId);
  const activeSkins = skins.data && skins.data.state !== 'void' ? skins.data : null;
  const result = activeSkins?.result?.holes.find((h) => h.hole === hole);
  const close = () => {
    Keyboard.dismiss();
    setSelected(null);
  };
  const open = async (kind: GameKind) => {
    if (beforeOpen && !(await beforeOpen())) return;
    setPreferred(kind);
    onSelect?.(kind);
    setSelected(kind);
  };
  return (
    <View style={[s.section, lobby && { borderColor: palette.ink + '22' }]}>
      <View style={s.heading}>
        <Text
          style={[
            s.label,
            lobby && { color: palette.fairway },
            overview && {
              fontFamily: fontFamily.display,
              fontSize: 30,
              letterSpacing: 0,
              color: palette.bone,
            },
          ]}
        >
          {overview ? 'Games & results' : lobby ? 'GAMES · OPTIONAL' : `GAMES · HOLE ${hole}`}
        </Text>
        {activeSkins && (
          <Text style={[s.detail, lobby && { color: palette.fairway }]}>Skins on</Text>
        )}
      </View>
      <View style={s.games}>
        {(Object.keys(GAME_RULES) as GameKind[]).map((kind) => (
          <Pressable
            key={kind}
            accessibilityRole="button"
            accessibilityLabel={GAME_RULES[kind].title}
            onPress={() => void open(kind)}
            style={[
              s.game,
              lobby && { backgroundColor: palette.ink + '08' },
              preferred === kind && { borderColor: palette.brass },
            ]}
          >
            <GameEmblem kind={kind} size={28} color={lobby ? palette.fairway : palette.brass} />
            <Text style={[s.gameName, lobby && { color: palette.ink }]}>
              {kind === 'closest'
                ? 'Closest'
                : kind === 'drive'
                  ? 'Longest'
                  : kind === 'custom'
                    ? 'Custom'
                    : 'Skins'}
            </Text>
          </Pressable>
        ))}
      </View>
      {!lobby && activeSkins && (
        <Text style={s.detail}>
          Skins ·{' '}
          {overview
            ? `${activeSkins.result?.resolvedHoles ?? 0} holes scored`
            : result?.state === 'won'
              ? `${activeSkins.players.find((p) => p.userId === result.winnerId)?.name ?? 'Player'} wins`
              : result?.state === 'carried'
                ? hole === holeCount
                  ? 'Tied · no award'
                  : 'Tied · carries forward'
                : 'Awaiting scores'}
        </Text>
      )}
      {!lobby &&
        side.data
          ?.filter((entry) => overview || entry.hole === hole)
          .sort((a, b) => a.hole - b.hole)
          .map((entry) => (
            <View
              key={entry.id}
              style={{
                flexDirection: 'row',
                gap: 14,
                paddingVertical: 18,
                borderBottomWidth: 0.5,
                borderColor: palette.bone + '22',
              }}
            >
              <View style={{ width: 44, alignItems: 'center', paddingTop: 4 }}>
                <GameEmblem
                  kind={
                    entry.label === GAME_RULES.drive.title
                      ? 'drive'
                      : entry.label === GAME_RULES.closest.title
                        ? 'closest'
                        : 'custom'
                  }
                />
                <Text style={[s.label, { marginTop: 8 }]}>
                  {String(entry.hole).padStart(2, '0')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fontFamily.display, fontSize: 22, color: palette.bone }}>
                  {entry.label} ·{' '}
                  {players.find((p) => p.user_id === entry.to_player)?.profile?.display_name ??
                    'Player'}{' '}
                  won
                </Text>
                <Text style={s.detail}>
                  From{' '}
                  {players.find((p) => p.user_id === entry.from_player)?.profile?.display_name ??
                    'Player'}
                </Text>
                <BrassAmount amount={entry.amount} size={22} />
              </View>
            </View>
          ))}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.ink }}>
          <View style={s.modalHeader}>
            <Text style={s.label}>{lobby || overview ? 'ROUND GAMES' : `HOLE ${hole}`}</Text>
            <Pressable accessibilityRole="button" onPress={close} style={s.close}>
              <Text style={s.detail}>Done</Text>
            </Pressable>
          </View>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            >
              {selected === 'skins' ? (
                <SkinsGamePanel roundId={roundId} setup={{ isHost: canEdit, holeCount, players }} />
              ) : selected && lobby ? (
                <>
                  <View style={s.ruleCard}>
                    <GameRulesContent game={selected} inline />
                  </View>

                  <Pressable accessibilityRole="button" onPress={close} style={s.primary}>
                    <Text style={{ color: palette.ink, fontSize: 17 }}>
                      Use {GAME_RULES[selected].title}
                    </Text>
                  </Pressable>
                </>
              ) : selected ? (
                <SideGamesPanel
                  key={`${selected}:${hole}`}
                  roundId={roundId}
                  selectedGame={selected}
                  hole={hole}
                  onSaved={close}
                  onCancel={close}
                />
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  section: { paddingVertical: 20, borderTopWidth: 0.5, borderColor: palette.bone + '33', gap: 12 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: palette.sage,
    flexShrink: 1,
  },
  games: { flexDirection: 'row', gap: 6 },
  game: {
    flex: 1,
    minHeight: 82,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: palette.graphite,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  gameName: { fontSize: 12, color: palette.bone, textAlign: 'center' },
  detail: { fontSize: 14, lineHeight: 22, color: palette.sage },
  summary: { paddingVertical: 20, gap: 8 },
  modalHeader: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  close: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'flex-end' },
  ruleCard: { marginVertical: 20, padding: 20, borderRadius: 16, backgroundColor: palette.bone },
  primary: {
    marginTop: 24,
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: palette.brass,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
});
