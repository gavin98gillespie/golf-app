import { Text, View } from 'react-native';

import { FollowButton } from '@/components/FollowButton';
import type { PublicProfile } from '@/lib/queries/users';
import { palette, fontFamily } from '@/theme/linksman';

type Props = { user: PublicProfile; viewerId: string };

export function OnboardingUserResult({ user, viewerId }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderColor: palette.ink + '22',
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: palette.ink + '11',
          borderWidth: 0.5,
          borderColor: palette.ink + '22',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 16,
            color: palette.ink,
          }}
        >
          {(user.display_name ?? user.username ?? '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 17,
            color: palette.ink,
          }}
          numberOfLines={1}
        >
          {user.display_name ?? '—'}
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 11,
            letterSpacing: 11 * 0.14,
            color: palette.ink,
            opacity: 0.55,
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          @{user.username ?? ''}
        </Text>
      </View>
      <FollowButton viewerId={viewerId} targetId={user.id} size="sm" />
    </View>
  );
}
