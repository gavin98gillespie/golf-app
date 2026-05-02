import { Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';

export default function StartTab() {
  return (
    <ScreenContainer>
      <Text className="text-text-primary text-3xl font-light mt-12">Start a round</Text>
      <Text className="text-text-secondary mt-2">Round flow lands in Tasks 10–12.</Text>
    </ScreenContainer>
  );
}
