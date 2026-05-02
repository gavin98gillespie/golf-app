import { Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';

export default function Profile() {
  return (
    <ScreenContainer>
      <Text className="text-text-primary text-3xl font-light mt-12">Profile</Text>
      <Text className="text-text-secondary mt-2">Your rounds list lands in Task 13.</Text>
    </ScreenContainer>
  );
}
