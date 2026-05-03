import { Text, View } from 'react-native';
import { palette, fontFamily } from '@/theme/linksman';

type Props = {
  displayName: string;
  username: string | null;
  status: 'invited' | 'joined' | 'withdrawn' | 'finished';
  scoreLabel?: string;
  isHost?: boolean;
  isMe?: boolean;
};

const STATUS_LABEL: Record<Props['status'], string> = {
  invited: 'INVITED',
  joined: 'PLAYING',
  withdrawn: 'WITHDREW',
  finished: 'FINISHED',
};

export function PlayerTile({ displayName, username, status, scoreLabel, isHost, isMe }: Props) {
  const muted = status === 'invited' || status === 'withdrawn';
  return (
    <View
      style={{
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 0.5,
        borderColor: palette.ink + '33',
        opacity: muted ? 0.55 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontFamily: fontFamily.display, fontSize: 18, color: palette.ink }}
          numberOfLines={1}
        >
          {displayName}
          {isMe ? ' (you)' : ''}
          {isHost ? ' · host' : ''}
        </Text>
        {username ? (
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 10,
              color: palette.ink,
              opacity: 0.55,
              marginTop: 2,
            }}
          >
            @{username}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.2,
            color: palette.ink,
            opacity: 0.6,
            textTransform: 'uppercase',
          }}
        >
          {STATUS_LABEL[status]}
        </Text>
        {scoreLabel ? (
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 16,
              color: palette.ink,
              marginTop: 2,
            }}
          >
            {scoreLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
