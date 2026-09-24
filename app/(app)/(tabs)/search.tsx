import { Redirect } from 'expo-router';
export default function LegacySearch() {
  return <Redirect href="/(app)/(tabs)?search=1" />;
}
