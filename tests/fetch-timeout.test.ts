import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFetchWithTimeout } from '../lib/fetchWithTimeout';

const stalled: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    const signal = init?.signal;
    const fail = () => reject(new Error('aborted'));
    if (signal?.aborted) fail();
    else signal?.addEventListener('abort', fail, { once: true });
  });

test('stalled backend calls abort instead of leaving screens pending forever', async () => {
  await assert.rejects(createFetchWithTimeout(stalled, 5)('https://example.com'), /aborted/);
});
test('caller cancellation is preserved for options and Request inputs', async () => {
  const controller = new AbortController();
  const request = createFetchWithTimeout(stalled)('https://example.com', {
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(request, /aborted/);
  await assert.rejects(
    createFetchWithTimeout(stalled)(
      new Request('https://example.com', { signal: controller.signal }),
    ),
    /aborted/,
  );
});
test('completed requests return the original response and clear their timeout', async () => {
  const response = new Response('ok');
  let signal: AbortSignal | null | undefined;
  const fetcher: typeof fetch = async (_input, init) => {
    signal = init?.signal;
    return response;
  };
  assert.equal(await createFetchWithTimeout(fetcher, 5)('https://example.com'), response);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(signal?.aborted, false);
});
