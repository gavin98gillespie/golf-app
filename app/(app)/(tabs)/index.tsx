import { Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';

export default function Feed() {
  return (
    <ScreenContainer>
      <Text className="text-text-primary text-3xl font-light mt-12">Home</Text>
      <Text className="text-text-secondary mt-2">Feed comes in Phase 3.</Text>
    </ScreenContainer>
  );
}
