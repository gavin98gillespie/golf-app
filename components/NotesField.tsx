import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { palette, fontFamily } from '@/theme/linksman';

type Props = {
  value: string;
  onChange: (next: string) => void;
  onCommit?: (next: string) => void;
  surface?: 'ink' | 'bone';
};

const MAX = 500;

export function NotesField({ value, onChange, onCommit, surface = 'ink' }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const fg = surface === 'ink' ? palette.bone : palette.ink;

  const save = () => {
    const trimmed = draft.slice(0, MAX);
    onChange(trimmed);
    onCommit?.(trimmed);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => {
          setDraft(value);
          setOpen(true);
        }}
        style={{ paddingVertical: 14 }}
      >
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.2,
            color: fg,
            opacity: 0.55,
            textTransform: 'uppercase',
          }}
        >
          NOTES
        </Text>
        <Text
          style={{
            fontFamily: value ? fontFamily.displayItalic : fontFamily.mono,
            fontSize: value ? 16 : 11,
            color: fg,
            opacity: value ? 0.9 : 0.5,
            marginTop: 6,
          }}
          numberOfLines={2}
        >
          {value || 'Tap to add a note about this round'}
        </Text>
      </Pressable>
      <Modal visible={open} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: palette.ink + 'EE', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: palette.bone, padding: 24, paddingBottom: 48 }}>
            <TextInput
              value={draft}
              onChangeText={(t) => setDraft(t.slice(0, MAX))}
              multiline
              autoFocus
              placeholder="How did it play?"
              placeholderTextColor={palette.ink + '66'}
              style={{
                fontFamily: fontFamily.editorial,
                fontSize: 18,
                color: palette.ink,
                minHeight: 140,
                textAlignVertical: 'top',
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 10,
                  color: palette.ink,
                  opacity: 0.5,
                }}
              >
                {draft.length}/{MAX}
              </Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Pressable onPress={() => setOpen(false)}>
                  <Text
                    style={{
                      fontFamily: fontFamily.mono,
                      fontSize: 12,
                      letterSpacing: 12 * 0.16,
                      color: palette.ink,
                      opacity: 0.55,
                      textTransform: 'uppercase',
                    }}
                  >
                    CANCEL
                  </Text>
                </Pressable>
                <Pressable onPress={save}>
                  <Text
                    style={{
                      fontFamily: fontFamily.mono,
                      fontSize: 12,
                      letterSpacing: 12 * 0.16,
                      color: palette.fairway,
                      textTransform: 'uppercase',
                    }}
                  >
                    SAVE
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
