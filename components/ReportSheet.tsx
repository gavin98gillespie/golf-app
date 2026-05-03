import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActionSheet } from '@/components/ActionSheet';
import { useSubmitReport, type ReportReason, type ReportTargetType } from '@/lib/queries/reports';
import { palette, fontFamily } from '@/theme/linksman';

type Props = {
  visible: boolean;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  onClose: () => void;
};

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
];

export function ReportSheet({ visible, reporterId, targetType, targetId, onClose }: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const submit = useSubmitReport();
  const sheet = useActionSheet();
  const insets = useSafeAreaInsets();

  const reset = () => {
    setReason(null);
    setDetails('');
  };

  const onSubmit = () => {
    if (!reason) return;
    const trimmed = details.trim();
    submit.mutate(
      {
        reporterId,
        targetType,
        targetId,
        reason,
        ...(trimmed ? { details: trimmed } : {}),
      },
      {
        onSuccess: () => {
          reset();
          onClose();
          sheet.show({
            title: 'Thanks',
            subtitle: 'Your report has been submitted.',
            actions: [{ label: 'OK' }],
          });
        },
        onError: (err) =>
          sheet.show({
            title: 'Could not submit',
            subtitle: err.message,
            actions: [{ label: 'OK' }],
          }),
      },
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: palette.ink + 'CC', justifyContent: 'flex-end' }}
      >
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
            REPORT
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 24,
              letterSpacing: -24 * 0.02,
              color: palette.ink,
              marginTop: 4,
            }}
          >
            Why are you reporting this?
          </Text>

          <View style={{ marginTop: 16 }}>
            {REASONS.map((r) => {
              const selected = reason === r.value;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setReason(r.value)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderTopWidth: 0.5,
                    borderColor: palette.ink + '22',
                  }}
                >
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: selected ? palette.fairway : palette.ink + '55',
                      backgroundColor: selected ? palette.fairway : 'transparent',
                      marginRight: 14,
                    }}
                  />
                  <Text
                    style={{
                      fontFamily: fontFamily.display,
                      fontSize: 18,
                      color: palette.ink,
                    }}
                  >
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Additional details (optional)"
            placeholderTextColor={palette.ink + '66'}
            multiline
            maxLength={500}
            style={{
              fontFamily: fontFamily.editorial ?? fontFamily.display,
              fontSize: 16,
              color: palette.ink,
              paddingVertical: 12,
              paddingHorizontal: 12,
              marginTop: 12,
              borderWidth: 0.5,
              borderColor: palette.ink + '33',
              minHeight: 84,
              textAlignVertical: 'top',
            }}
          />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <Pressable
              onPress={() => {
                reset();
                onClose();
              }}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderWidth: 0.5,
                borderColor: palette.ink + '55',
                alignItems: 'center',
              }}
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
                Cancel
              </Text>
            </Pressable>
            <Pressable
              disabled={!reason || submit.isPending}
              onPress={onSubmit}
              style={{
                flex: 1,
                paddingVertical: 14,
                backgroundColor: palette.fairway,
                alignItems: 'center',
                opacity: !reason || submit.isPending ? 0.4 : 1,
              }}
            >
              {submit.isPending ? (
                <ActivityIndicator size="small" color={palette.bone} />
              ) : (
                <Text
                  style={{
                    fontFamily: fontFamily.mono,
                    fontSize: 12,
                    letterSpacing: 12 * 0.16,
                    color: palette.bone,
                    textTransform: 'uppercase',
                  }}
                >
                  Submit
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
