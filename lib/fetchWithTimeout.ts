/** Bound network waits while preserving cancellation from the caller. */
export function createFetchWithTimeout(fetcher: typeof fetch, timeoutMs = 20_000): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const source =
      init?.signal ??
      (typeof Request !== 'undefined' && input instanceof Request ? input.signal : undefined);
    const abort = () => controller.abort(source?.reason);
    if (source?.aborted) abort();
    else source?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetcher(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      source?.removeEventListener('abort', abort);
    }
  };
}
