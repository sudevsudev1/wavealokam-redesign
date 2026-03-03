import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

const OPS_EMAIL_DOMAIN = '@ops.wavealokam.com';

export type OpsRole = 'manager' | 'admin';

export interface OpsProfile {
  id: string;
  userId: string;
  displayName: string;
  role: OpsRole;
  preferredLanguage: string;
  branchId: string;
}

interface OpsAuthState {
  session: Session | null;
  profile: OpsProfile | null;
  loading: boolean;
  signIn: (userId: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const OpsAuthContext = createContext<OpsAuthState | null>(null);

export function OpsAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<OpsProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('ops_user_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    if (data) {
      setProfile({
        id: data.id,
        userId: data.user_id,
        displayName: data.display_name,
        role: data.role as OpsRole,
        preferredLanguage: data.preferred_language,
        branchId: data.branch_id,
      });
    }
    return data;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        // Check if this user has an ops profile (defer to avoid deadlock)
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (userId: string, password: string): Promise<{ error: string | null }> => {
    const email = userId.includes('@') ? userId : `${userId}${OPS_EMAIL_DOMAIN}`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  return (
    <OpsAuthContext.Provider value={{
      session,
      profile,
      loading,
      signIn,
      signOut,
      isAdmin: profile?.role === 'admin',
    }}>
      {children}
    </OpsAuthContext.Provider>
  );
}

export function useOpsAuth() {
  const ctx = useContext(OpsAuthContext);
  if (!ctx) throw new Error('useOpsAuth must be used within OpsAuthProvider');
  return ctx;
}
