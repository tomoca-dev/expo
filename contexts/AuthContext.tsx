import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

type ProfileRole = 'admin' | 'buyer';
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    if (!supabase) {
      setProfile(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,role,status,buyer_id')
        .eq('id', uid)
        .maybeSingle();

      console.log('PROFILE QUERY:', { uid, data, error });

      if (error) {
        console.error('Profile fetch error:', error);
        setProfile(null);
        return;
      }

      setProfile((data as Profile | null) ?? null);
    } catch (err) {
      console.error('Unexpected profile fetch error:', err);
      setProfile(null);
    }
  };

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
          await loadProfile(sessionUser.id);
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

    init();

    if (!supabase) return () => { mounted = false; };

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const sessionUser = session?.user ?? null;
        console.log('AUTH STATE CHANGE:', { event: _event, sessionUser });

        setUser(sessionUser);

        if (sessionUser) {
          await loadProfile(sessionUser.id);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setProfile(null);
      } finally {
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