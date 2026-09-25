import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GAME_RULES, type GameKind } from '@/lib/gameRules';
import { palette, fontFamily } from '@/theme/linksman';

export function RulesButton({
  game,
  surface = 'ink',
}: {
  game: GameKind;
  surface?: 'ink' | 'bone';
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`How to play ${GAME_RULES[game].title}`}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 44,
          alignSelf: 'flex-start',
          justifyContent: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          paddingHorizontal: 14,
          borderRadius: 22,
          borderWidth: 0.5,
          borderColor: surface === 'ink' ? palette.sage + '66' : palette.fairway + '66',
          marginBottom: 16,
        }}
      >
        <Text style={{ color: surface === 'ink' ? palette.sage : palette.fairway, fontSize: 17 }}>
          ⓘ
        </Text>
        <Text style={{ color: surface === 'ink' ? palette.sage : palette.fairway, fontSize: 15 }}>
          How to play
        </Text>
      </Pressable>
      <GameRulesSheet game={game} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
export function GameRulesSheet({
  game,
  visible,
  onClose,
}: {
  game: GameKind;
  visible: boolean;
  onClose: () => void;
}) {
  const info = GAME_RULES[game];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.ink + 'B8', justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close rules"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <SafeAreaView
          edges={['bottom']}
          style={{
            maxHeight: '88%',
            backgroundColor: palette.bone,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        >
          <View
            style={{
              paddingHorizontal: 24,
              paddingTop: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderColor: palette.ink + '22',
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                flexShrink: 1,
                marginRight: 12,
                letterSpacing: 1.5,
                color: palette.fairway,
              }}
            >
              LINKSMAN · RULES CARD
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={{
                minHeight: 48,
                minWidth: 48,
                justifyContent: 'center',
                alignItems: 'flex-end',
              }}
            >
              <Text style={{ color: palette.fairway, fontSize: 17 }}>Done</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <Text
              accessibilityRole="header"
              style={{ color: palette.ink, fontFamily: fontFamily.display, fontSize: 32 }}
            >
              {info.title}
            </Text>
            <Text style={{ color: palette.fairway, fontSize: 14, marginTop: 6, marginBottom: 20 }}>
              {info.subtitle}
            </Text>
            {info.rules.map((rule, i) => (
              <View
                key={rule}
                style={{
                  flexDirection: 'row',
                  borderTopWidth: 0.5,
                  borderColor: palette.ink + '28',
                  paddingVertical: 14,
                }}
              >
                <View
                  style={{
                    width: 32,
                    borderRightWidth: 0.5,
                    borderColor: palette.ink + '28',
                    marginRight: 14,
                  }}
                >
                  <Text
                    style={{ color: palette.fairway, fontFamily: fontFamily.mono, fontSize: 13 }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </Text>
                </View>
                <Text style={{ flex: 1, color: palette.ink, fontSize: 16, lineHeight: 23 }}>
                  {rule}
                </Text>
              </View>
            ))}
            <View
              style={{
                borderTopWidth: 2,
                borderColor: palette.fairway,
                paddingTop: 16,
                marginTop: 6,
              }}
            >
              <Text
                style={{
                  color: palette.fairway,
                  fontFamily: fontFamily.mono,
                  fontSize: 11,
                  letterSpacing: 1,
                }}
              >
                BRASS EXAMPLE
              </Text>
              <Text style={{ color: palette.ink, fontSize: 16, lineHeight: 23, marginTop: 8 }}>
                {info.example}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
