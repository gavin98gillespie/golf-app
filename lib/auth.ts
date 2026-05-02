import { supabase } from './supabase';

export type AuthError = { message: string };

export async function signUp(
  email: string,
  password: string,
): Promise<{ error: AuthError | null; needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { error: { message: error.message }, needsEmailConfirmation: false };
  }
  // When email confirmation is enabled in Supabase, signUp returns a user but
  // no session. The client must wait for the user to click the confirmation
  // link before a session is established.
  const needsEmailConfirmation = !data.session && !!data.user;
  return { error: null, needsEmailConfirmation };
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
