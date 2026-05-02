import { useEffect } from 'react';
import { router } from 'expo-router';

export default function StartTab() {
  useEffect(() => {
    router.replace('/round/new/course');
  }, []);
  return null;
}
