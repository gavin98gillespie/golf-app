import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QueryClient } from '@tanstack/react-query';
import { completeOnboarding } from '../lib/completeOnboarding';

test('completion updates the guard cache before navigation and rejects stale in-flight reads', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = ['profile', 'golfer'];
  const old = { id: 'golfer', onboarding_completed: false };
  client.setQueryData(key, old);
  let resolveOld!: (value: typeof old) => void;
  const fetch = client
    .fetchQuery({
      queryKey: key,
      queryFn: () =>
        new Promise<typeof old>((resolve) => {
          resolveOld = resolve;
        }),
    })
    .catch(() => {});
  await completeOnboarding(client, 'golfer', async () => ({ ...old, onboarding_completed: true }));
  assert.equal(client.getQueryData<typeof old>(key)?.onboarding_completed, true);
  resolveOld(old);
  await fetch;
  assert.equal(client.getQueryData<typeof old>(key)?.onboarding_completed, true);
  client.clear();
});

test('failed completion never marks the profile complete', async () => {
  const client = new QueryClient();
  const old = { id: 'golfer', onboarding_completed: false };
  client.setQueryData(['profile', 'golfer'], old);
  await assert.rejects(
    completeOnboarding(client, 'golfer', async () => {
      throw new Error('failed');
    }),
  );
  assert.deepEqual(client.getQueryData(['profile', 'golfer']), old);
  await assert.rejects(completeOnboarding(client, 'golfer', async () => old));
  assert.deepEqual(client.getQueryData(['profile', 'golfer']), old);
  client.clear();
});
