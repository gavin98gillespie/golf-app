import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BrassAmount } from '@/components/BrassAmount';
import { useBrassLedger } from '@/lib/queries/skins';
import { fontFamily, palette } from '@/theme/linksman';
export function BrassOverview({ light = false }: { light?: boolean }) {
  const query = useBrassLedger();
  const total = Math.round((query.data ?? []).reduce((sum, e) => sum + e.change, 0) * 100) / 100;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Your Brass. Open rivalry ledger"
      onPress={() => router.push('/ledger')}
      style={{
        paddingVertical: 20,

        gap: 8,
        borderBottomWidth: 0.5,
        borderColor: light ? palette.ink + '22' : palette.brass + '44',
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 11,
          letterSpacing: 1.5,
          color: light ? palette.fairway : palette.sage,
        }}
      >
        YOUR BRASS
      </Text>
      {query.isPending || query.isError ? (
        <Text style={{ color: light ? palette.ink : palette.bone }}>
          {query.isError ? 'Open ledger to retry' : 'Loading results…'}
        </Text>
      ) : (
        <BrassAmount amount={total} signed light={light} size={34} />
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ fontSize: 13, color: light ? palette.fairway : palette.sage }}>
          Net winnings · points
        </Text>
        <Text style={{ fontSize: 13, color: light ? palette.fairway : palette.brass }}>
          Rivalry ledger
        </Text>
      </View>
    </Pressable>
  );
}
