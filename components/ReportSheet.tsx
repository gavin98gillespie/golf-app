import { useState } from 'react';
import { Modal, Pressable, Text, View, TextInput, ActivityIndicator, Alert } from 'react-native';

import { useSubmitReport, type ReportReason, type ReportTargetType } from '@/lib/queries/reports';

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
          Alert.alert('Thanks', 'Your report has been submitted.');
          setReason(null);
          setDetails('');
          onClose();
        },
        onError: (err) => Alert.alert('Could not submit', err.message),
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-bg-base border-t border-border-subtle rounded-t-3xl p-6 pb-10">
          <Text className="text-text-primary text-2xl font-light">Report</Text>
          <Text className="text-text-secondary text-sm mt-1">Why are you reporting this?</Text>

          <View className="mt-4">
            {REASONS.map((r) => {
              const selected = reason === r.value;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setReason(r.value)}
                  className={`flex-row items-center py-3 px-4 mb-2 rounded-2xl border ${
                    selected ? 'border-accent bg-accent/10' : 'border-border-subtle'
                  } active:opacity-70`}
                >
                  <View
                    className={`w-5 h-5 rounded-full border ${selected ? 'border-accent bg-accent' : 'border-border-subtle'}`}
                  />
                  <Text className="text-text-primary text-sm ml-3">{r.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Additional details (optional)"
            placeholderTextColor="#4a5a52"
            multiline
            maxLength={500}
            className="bg-bg-surface border border-border-subtle rounded-2xl px-4 py-3 mt-2 text-text-primary text-sm min-h-[80px]"
          />

          <View className="flex-row mt-4">
            <Pressable
              onPress={onClose}
              className="flex-1 py-3 rounded-full border border-border-subtle mr-2 active:opacity-70"
            >
              <Text className="text-text-primary text-sm font-semibold text-center">Cancel</Text>
            </Pressable>
            <Pressable
              disabled={!reason || submit.isPending}
              onPress={onSubmit}
              className={`flex-1 py-3 rounded-full ${reason && !submit.isPending ? 'bg-accent active:opacity-70' : 'bg-bg-surface opacity-50'}`}
            >
              {submit.isPending ? (
                <ActivityIndicator size="small" color="#08100c" />
              ) : (
                <Text
                  className={`text-sm font-semibold text-center ${reason ? 'text-bg-base' : 'text-text-secondary'}`}
                >
                  Submit
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
