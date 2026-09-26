import { Pressable, Text, View } from 'react-native';
import type { DraftState } from '@/lib/scoring/scoreDraft';
import { fontFamily, palette } from '@/theme/linksman';
export function ScoreSaveStatus({
  status,
  retry,
}: {
  status: DraftState['status'];
  retry: () => void;
}) {
  const text =
    status === 'error'
      ? 'Not saved · retry'
      : status === 'saving' || status === 'unsaved'
        ? 'Saving…'
        : status === 'saved'
          ? 'Saved'
          : '';
  const label = (
    <Text
      accessibilityLiveRegion="polite"
      style={{
        fontFamily: fontFamily.mono,
        fontSize: 12,
        color: status === 'error' ? palette.clay : palette.sage,
      }}
    >
      {text}
    </Text>
  );
  return status === 'error' ? (
    <Pressable
      accessibilityRole="button"
      onPress={retry}
      style={{ minHeight: 44, justifyContent: 'center' }}
    >
      {label}
    </Pressable>
  ) : (
    <View style={{ minHeight: 28, justifyContent: 'center' }}>{text ? label : null}</View>
  );
}
