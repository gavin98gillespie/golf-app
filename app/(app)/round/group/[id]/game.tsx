import { Redirect, useLocalSearchParams } from 'expo-router';
import { isGameKind } from '@/lib/gameRules';
/** Legacy game links open the game tools on the one shared scorecard. */
export default function Game() {
  const { id, game } = useLocalSearchParams<{ id: string; game?: string }>();
  return (
    <Redirect
      href={{
        pathname: '/round/group/[id]/score',
        params: { id, games: '1', ...(isGameKind(game) ? { game } : {}) },
      }}
    />
  );
}
