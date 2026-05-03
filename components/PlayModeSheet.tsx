import { Modal, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { palette, fontFamily } from '@/theme/linksman';

type Props = { visible: boolean; onClose: () => void };

export function PlayModeSheet({ visible, onClose }: Props) {
  const go = (path: string) => {
    onClose();
    router.push(path);
  };
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: palette.ink + 'CC' }} />
      <View style={{ backgroundColor: palette.bone, padding: 24, paddingBottom: 48 }}>
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
          NEW ROUND
        </Text>
        <Pressable
          onPress={() => go('/round/new/course')}
          style={{
            marginTop: 16,
            paddingVertical: 18,
            borderTopWidth: 0.5,
            borderBottomWidth: 0.5,
            borderColor: palette.ink + '33',
          }}
        >
          <Text style={{ fontFamily: fontFamily.display, fontSize: 22, color: palette.ink }}>
            Solo round
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              color: palette.ink,
              opacity: 0.55,
              marginTop: 4,
            }}
          >
            Just you and the course.
          </Text>
        </Pressable>
        <Pressable
          onPress={() => go('/round/new/group-setup')}
          style={{
            paddingVertical: 18,
            borderBottomWidth: 0.5,
            borderColor: palette.ink + '33',
          }}
        >
          <Text style={{ fontFamily: fontFamily.display, fontSize: 22, color: palette.ink }}>
            Group round
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              color: palette.ink,
              opacity: 0.55,
              marginTop: 4,
            }}
          >
            Score live with friends.
          </Text>
        </Pressable>
        <Pressable onPress={() => go('/join-round')} style={{ paddingVertical: 18 }}>
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 12,
              letterSpacing: 12 * 0.16,
              color: palette.fairway,
              textTransform: 'uppercase',
            }}
          >
            HAVE A JOIN CODE? →
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}
