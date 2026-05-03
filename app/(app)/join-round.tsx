import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { useActionSheet } from '@/components/ActionSheet';
import { useJoinViaCode } from '@/lib/queries/groupRounds';
import { palette, fontFamily } from '@/theme/linksman';

export default function JoinRound() {
  const [code, setCode] = useState('');
  const [tee, setTee] = useState('white');
  const join = useJoinViaCode();
  const sheet = useActionSheet();

  const onJoin = async () => {
    if (code.length !== 6) {
      sheet.show({
        title: 'Invalid code',
        subtitle: 'Codes are 6 characters.',
        actions: [{ label: 'OK' }],
      });
      return;
    }
    try {
      const roundId = await join.mutateAsync({ code: code.toUpperCase(), teeBox: tee });
      router.replace(`/round/group/${roundId}/lobby` as never);
    } catch (e: unknown) {
      sheet.show({
        title: 'Could not join',
        subtitle: e instanceof Error ? e.message : 'Unknown error',
        actions: [{ label: 'OK' }],
      });
    }
  };

  return (
    <ScreenContainer surface="bone">
      <View
        style={{
          paddingTop: 8,
          paddingBottom: 14,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Wordmark size={20} color={palette.ink} />
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              letterSpacing: 11 * 0.16,
              color: palette.ink,
              opacity: 0.6,
              textTransform: 'uppercase',
            }}
          >
            CANCEL
          </Text>
        </Pressable>
      </View>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 9 * 0.2,
          color: palette.ink,
          opacity: 0.5,
          textTransform: 'uppercase',
          marginTop: 16,
        }}
      >
        JOIN BY CODE
      </Text>
      <Text style={{ fontFamily: fontFamily.display, fontSize: 36, color: palette.ink, marginTop: 4 }}>
        Enter the code
      </Text>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().slice(0, 6))}
        placeholder="6-CHAR CODE"
        placeholderTextColor={palette.ink + '66'}
        autoCapitalize="characters"
        autoFocus
        style={{
          fontFamily: fontFamily.display,
          fontSize: 32,
          color: palette.ink,
          letterSpacing: 4,
          paddingVertical: 16,
          marginTop: 24,
          borderBottomWidth: 0.5,
          borderBottomColor: palette.ink + '33',
        }}
      />

      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 9 * 0.2,
          color: palette.ink,
          opacity: 0.55,
          textTransform: 'uppercase',
          marginTop: 24,
        }}
      >
        YOUR TEE
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        {(['black', 'blue', 'white', 'gold', 'red'] as const).map((t) => {
          const active = t === tee;
          return (
            <Pressable
              key={t}
              onPress={() => setTee(t)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderWidth: 0.5,
                borderColor: active ? palette.fairway : palette.ink + '33',
                backgroundColor: active ? palette.fairway + '11' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 11,
                  letterSpacing: 11 * 0.16,
                  color: active ? palette.fairway : palette.ink,
                  textTransform: 'uppercase',
                }}
              >
                {t}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={onJoin}
        disabled={join.isPending || code.length !== 6}
        style={{
          marginTop: 32,
          backgroundColor: palette.brass,
          paddingVertical: 16,
          alignItems: 'center',
          opacity: join.isPending || code.length !== 6 ? 0.5 : 1,
        }}
      >
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 13,
            letterSpacing: 13 * 0.18,
            color: palette.ink,
            textTransform: 'uppercase',
          }}
        >
          JOIN →
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}
