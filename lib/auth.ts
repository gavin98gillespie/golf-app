import { supabase } from './supabase';

export type AuthError = { message: string };

export async function signUp(
  email: string,
  password: string,
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signUp({ email, password });
  return { error: error ? { message: error.message } : null };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? { message: error.message } : null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
