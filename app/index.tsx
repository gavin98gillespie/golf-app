import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/theme';
import { supabase } from '@/lib/supabase';

export default function Index() {
  useEffect(() => {
    void supabase.auth.getSession().then(({ data, error }) => {
      // eslint-disable-next-line no-console
      console.log('[supabase] session check:', { hasSession: !!data.session, error });
    });
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-bg-base">
      <Text className="text-text-primary text-5xl font-light tracking-tight">Hello, Golf</Text>
      <Text className="text-text-secondary text-sm mt-2 tracking-wider uppercase">
        Phase 1 · Setup
      </Text>
      <View
        className="mt-6 px-3 py-1 rounded-full"
        style={{
          backgroundColor: colors.accentSoft,
          borderColor: colors.accent,
          borderWidth: 1,
        }}
      >
        <Text className="text-xs" style={{ color: colors.accent }}>
          v0.0.2
        </Text>
      </View>
    </View>
  );
}
