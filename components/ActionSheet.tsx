import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, fontFamily } from '@/theme/linksman';

export type ActionTone = 'default' | 'destructive' | 'sage';

export type ActionSheetAction = {
  label: string;
  tone?: ActionTone;
  onPress?: () => void | Promise<void>;
};

export type ActionSheetOptions = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ActionSheetAction[];
  cancelLabel?: string;
  onCancel?: () => void;
};

type Ctx = { show: (opts: ActionSheetOptions) => void };

const ActionSheetContext = createContext<Ctx | null>(null);

export function ActionSheetProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ActionSheetOptions | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((next: ActionSheetOptions) => setOpts(next), []);
  const close = useCallback(() => setOpts(null), []);

  const ctx = useMemo<Ctx>(() => ({ show }), [show]);

  const onCancel = () => {
    opts?.onCancel?.();
    close();
  };

  const onActionTap = async (a: ActionSheetAction) => {
    close();
    // Defer to next tick so the modal animation can start before any
    // navigation or follow-up dialog runs (avoids modal-stack glitches on iOS).
    setTimeout(() => {
      void a.onPress?.();
    }, 0);
  };

  return (
    <ActionSheetContext.Provider value={ctx}>
      {children}
      <Modal
        visible={!!opts}
        transparent
        animationType="fade"
        onRequestClose={onCancel}
        statusBarTranslucent
      >
        <Pressable
          onPress={onCancel}
          style={{ flex: 1, backgroundColor: palette.ink + 'CC', justifyContent: 'flex-end' }}
        >
          {/* Inner pressable swallows taps so the sheet itself doesn't dismiss. */}
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: palette.bone,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
            }}
          >
            {opts?.eyebrow ? (
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 9,
                  letterSpacing: 9 * 0.2,
                  color: palette.ink,
                  opacity: 0.5,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                {opts.eyebrow}
              </Text>
            ) : null}
            {opts?.title ? (
              <Text
                style={{
                  fontFamily: fontFamily.display,
                  fontSize: 24,
                  letterSpacing: -24 * 0.02,
                  lineHeight: 24 * 1.15,
                  color: palette.ink,
                }}
              >
                {opts.title}
              </Text>
            ) : null}
            {opts?.subtitle ? (
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 12,
                  lineHeight: 12 * 1.5,
                  color: palette.ink,
                  opacity: 0.65,
                  marginTop: 8,
                }}
              >
                {opts.subtitle}
              </Text>
            ) : null}

            <View style={{ marginTop: 20, gap: 0 }}>
              {(opts?.actions ?? []).map((a, i) => (
                <ActionRow key={`${a.label}-${i}`} action={a} onPress={() => onActionTap(a)} />
              ))}
            </View>

            <Pressable
              onPress={onCancel}
              style={{
                marginTop: 8,
                paddingVertical: 16,
                alignItems: 'center',
                borderTopWidth: 0.5,
                borderColor: palette.ink + '22',
              }}
              hitSlop={4}
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 12,
                  letterSpacing: 12 * 0.16,
                  color: palette.ink,
                  opacity: 0.7,
                  textTransform: 'uppercase',
                }}
              >
                {opts?.cancelLabel ?? 'Cancel'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ActionSheetContext.Provider>
  );
}

function ActionRow({ action, onPress }: { action: ActionSheetAction; onPress: () => void }) {
  const tone = action.tone ?? 'default';
  const color =
    tone === 'destructive' ? palette.clay : tone === 'sage' ? palette.fairway : palette.ink;
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 16,
        borderTopWidth: 0.5,
        borderColor: palette.ink + '22',
      }}
    >
      <Text
        style={{
          fontFamily: fontFamily.display,
          fontSize: 18,
          color,
          letterSpacing: -18 * 0.01,
        }}
      >
        {action.label}
      </Text>
    </Pressable>
  );
}

export function useActionSheet(): Ctx {
  const ctx = useContext(ActionSheetContext);
  if (!ctx) throw new Error('useActionSheet must be used inside <ActionSheetProvider>');
  return ctx;
}
