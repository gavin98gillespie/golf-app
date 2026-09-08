import type { QueryClient } from '@tanstack/react-query';

/** Publish the confirmed profile before callers navigate through the app guard. */
export async function completeOnboarding<T extends { id: string; onboarding_completed: boolean }>(
  client: QueryClient,
  userId: string,
  update: () => Promise<T>,
): Promise<T> {
  const queryKey = ['profile', userId];
  await client.cancelQueries({ queryKey });
  const profile = await update();
  if (profile.id !== userId || !profile.onboarding_completed) {
    throw new Error('Onboarding completion was not confirmed.');
  }
  // Also cancel any refetch started while the update was in flight.
  await client.cancelQueries({ queryKey });
  client.setQueryData(queryKey, profile);
  return profile;
}
