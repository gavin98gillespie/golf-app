import { ScrollView, Text, View } from 'react-native';

import type { GroupRoundPlayer } from '@/lib/queries/groupRounds';
import type { Tables } from '@/lib/supabase';
import { palette, fontFamily } from '@/theme/linksman';

type Props = {
  players: GroupRoundPlayer[];
  holes: Tables<'round_holes'>[];
  meId: string | undefined;
};

export function PlayerProgressStrip({ players, holes, meId }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    >
      {players
        .filter((p) => p.status === 'joined' || p.status === 'finished')
        .map((p) => {
          const myHoles = holes.filter((h) => h.player_id === p.user_id);
          const thru = myHoles.length;
          const totalScore = myHoles.reduce((s, h) => s + h.score, 0);
          const totalPar = myHoles.reduce((s, h) => s + h.par, 0);
          const diff = totalScore - totalPar;
          const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
          const isMe = p.user_id === meId;
          const finished = p.status === 'finished';
          return (
            <View
              key={p.user_id}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderWidth: 0.5,
                borderColor: isMe ? palette.brass : palette.bone + '33',
                backgroundColor: isMe ? palette.brass + '14' : 'transparent',
                minWidth: 96,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 9,
                  letterSpacing: 9 * 0.16,
                  color: palette.bone,
                  opacity: 0.7,
                  textTransform: 'uppercase',
                }}
                numberOfLines={1}
              >
                {(p.profile?.display_name ?? '—').split(' ')[0]}
                {finished ? ' ✓' : ''}
              </Text>
              <Text
                style={{
                  fontFamily: fontFamily.display,
                  fontSize: 16,
                  color: palette.bone,
                  marginTop: 2,
                }}
              >
                {thru === 0 ? '—' : `${diffLabel} · thru ${thru}`}
              </Text>
            </View>
          );
        })}
    </ScrollView>
  );
}
