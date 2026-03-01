import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  sendOTP: (phone: string) => Promise<{ error: Error | null }>;
  verifyOTP: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && __DEV__ && Platform.OS === 'web') return;
      setSession(session);
      setLoading(false);
    });

    if (__DEV__ && Platform.OS === 'web') {
      supabase.auth
        .signInWithPassword({ email: 'dev@local.test', password: 'devpassword' })
        .then(({ error }) => {
          if (error) {
            console.error('[dev] auto sign-in failed:', error.message);
            setLoading(false);
          }
        });
    }

    return () => subscription.unsubscribe();
  }, []);

  async function sendOTP(phone: string) {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return { error };
  }

  async function verifyOTP(phone: string, token: string) {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    return { error };
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  return (
    <AuthContext.Provider value={{ session, loading, sendOTP, verifyOTP, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
