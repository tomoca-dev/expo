import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

type ProfileRole = 'admin' | 'buyer' | 'finance' | 'management' | 'sales';
type ProfileStatus = 'pending' | 'active' | 'rejected';

type Profile = {
  id: string;
  email: string | null;
  role: ProfileRole;
  status: ProfileStatus;
  buyer_id: string | null;
};

type AuthContextType = {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T,>(label: string, promise: Promise<T>, timeoutMs = 15000): Promise<T> => {
  let timer: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) window.clearTimeout(timer);
  }
};

const loadProfileInternal = async (
  uid: string,
  setProfile: (p: Profile | null) => void
) => {
  if (!supabase) {
    setProfile(null);
    return;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { data, error } = await withTimeout(
        'profile',
        supabase
          .from('profiles')
          .select('id,email,role,status,buyer_id')
          .eq('id', uid)
          .maybeSingle()
      );

      if (error) throw error;

      setProfile((data as Profile | null) ?? null);
      return;
    } catch (err: any) {
      console.warn(`Profile fetch attempt ${attempt + 1} failed:`, err?.message || err);
      
      const isRecursion = String(err?.message || '').toLowerCase().includes('recursion');
      if (isRecursion) {
        console.error('CRITICAL: Infinite recursion detected in Supabase RLS policies. Retries stopped.');
        setProfile(null);
        return;
      }

      if (attempt < 2) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      setProfile(null);
    }
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = React.useCallback(async (uid: string) => {
    await loadProfileInternal(uid, setProfile);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (!supabase) {
          console.warn('Supabase not available in AuthContext');
          if (!mounted) return;
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        console.log('GET SESSION:', { data, error });

        if (!mounted) return;

        const sessionUser = data.session?.user ?? null;
        setUser(sessionUser);

        if (sessionUser) {
          await loadProfileInternal(sessionUser.id, setProfile);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (!mounted) return;
        setUser(null);
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const fallbackTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    init().finally(() => clearTimeout(fallbackTimer));

    if (!supabase) return () => { mounted = false; };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      console.log('AUTH STATE CHANGE:', { event: _event, sessionUser });

      setUser(sessionUser);

      if (sessionUser) {
        void loadProfileInternal(sessionUser.id, setProfile).finally(() => {
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signOut,
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};