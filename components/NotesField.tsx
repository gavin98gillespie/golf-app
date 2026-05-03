import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
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

  const close = () => setOpen(false);

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
      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <Pressable
            onPress={close}
            style={{ flex: 1, backgroundColor: palette.ink + 'EE' }}
          />
          <View style={{ backgroundColor: palette.bone, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
            {/* Action bar at TOP so it stays visible above the keyboard */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 12,
                borderBottomWidth: 0.5,
                borderBottomColor: palette.ink + '20',
              }}
            >
              <Pressable onPress={close} hitSlop={8}>
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
                ROUND NOTE
              </Text>
              <Pressable onPress={save} hitSlop={8}>
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
                minHeight: 120,
                maxHeight: 200,
                textAlignVertical: 'top',
                marginTop: 12,
              }}
            />
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 10,
                color: palette.ink,
                opacity: 0.45,
                marginTop: 8,
                textAlign: 'right',
              }}
            >
              {draft.length}/{MAX}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
