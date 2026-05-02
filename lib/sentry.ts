import * as Sentry from '@sentry/react-native';

let initialized = false;

export function initSentry() {
  if (initialized) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || dsn.includes('YOUR_DSN_HERE')) {
    console.warn('Sentry DSN not configured; skipping init');
    return;
  }
  Sentry.init({
    dsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: __DEV__ ? 0 : 0.2,
    sendDefaultPii: false,
  });
  initialized = true;
}

export function captureError(err: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
