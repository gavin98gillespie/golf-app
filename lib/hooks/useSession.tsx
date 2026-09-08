import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export type SessionState = { session: Session | null; loading: boolean };

const SessionContext = createContext<SessionState>({ session: null, loading: true });

/**
 * Owns the app's single Supabase auth subscription. Call this exactly once,
 * in the root layout, and feed the result to `SessionProvider`.
 *
 * Every consumer reads the same value through context, so guards and screens
 * can never disagree about whether a user is signed in mid-transition.
 */
export function useSessionState(): SessionState {
  const [state, setState] = useState<SessionState>({ session: null, loading: true });

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setState({ session: data.session, loading: false });
      })
      .catch(() => {
        // An unreachable auth endpoint resolves as signed-out. Leaving
        // `loading` true would strand every guard on a spinner forever.
        if (active) setState({ session: null, loading: false });
      });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (active) setState({ session: newSession, loading: false });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function SessionProvider({
  value,
  children,
}: PropsWithChildren<{ value: SessionState }>) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
