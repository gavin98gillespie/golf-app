/**
 * Validates required env vars at module load. Throws clearly if missing
 * so we fail at boot, not deep inside a feature with a cryptic null error.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required env var: ${name}. ` +
        `Copy .env.example to .env.local and fill in real values from your Supabase project.`,
    );
  }
  return value;
}

export const env = {
  SUPABASE_URL: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
} as const;
