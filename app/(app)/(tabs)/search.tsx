import { Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { palette, fontFamily } from '@/theme/linksman';

export default function Search() {
  return (
    <ScreenContainer>
      <View style={{ marginTop: 24 }}>
        <Text
          style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.bone, opacity: 0.55 }}
        >
          SEARCH
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 32,
            color: palette.bone,
            marginTop: 4,
          }}
        >
          Coming next.
        </Text>
      </View>
    </ScreenContainer>
  );
}
