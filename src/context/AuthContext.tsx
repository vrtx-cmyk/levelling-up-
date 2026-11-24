import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, UserStatus } from '../types';

export interface SignInResult {
  error?: string;
  unconfirmedEmail?: boolean;
  user?: User | null;
  profile?: Profile | null;
}

export interface SignUpResult {
  error?: string;
  session?: boolean;
  user?: User | null;
}

function mapAuthError(rawMessage: string, context: 'login' | 'signup' | 'resend'): {
  message: string;
  unconfirmedEmail?: boolean;
} {
  const msg = (rawMessage || '').toLowerCase();

  if (context === 'login') {
    if (msg.includes('email not confirmed') || msg.includes('confirm your email')) {
      return {
        message: 'Please confirm your email first',
        unconfirmedEmail: true,
      };
    }
    if (
      msg.includes('invalid login credentials') ||
      msg.includes('invalid credentials') ||
      msg.includes('wrong password')
    ) {
      return { message: 'Invalid email or password.' };
    }
    return { message: 'Something went wrong. Please try again.' };
  }

  if (context === 'signup') {
    if (
      msg.includes('already') &&
      (msg.includes('registered') || msg.includes('exists') || msg.includes('user'))
    ) {
      return { message: 'This email is already registered. Try logging in.' };
    }
    if (
      msg.includes('password') &&
      (msg.includes('6') || msg.includes('short') || msg.includes('length') || msg.includes('least'))
    ) {
      return { message: 'Password must be at least 6 characters.' };
    }
    return { message: 'Something went wrong. Please try again.' };
  }

  return { message: 'Something went wrong. Please try again.' };
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  status: UserStatus;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string, fullName?: string) => Promise<SignUpResult>;
  resendConfirmationEmail: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to fetch or auto-create profile in Supabase
  const fetchOrCreateProfile = useCallback(async (authUser: User): Promise<Profile | null> => {
    console.log(`[AuthContext] 🔍 Fetching profile for user: ${authUser.id} (${authUser.email})`);
    try {
      // 1. Attempt to fetch existing profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] ❌ Error executing SELECT on profiles table:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      }

      if (data) {
        console.log('[AuthContext] ✅ Successfully retrieved profile:', data);
        return data as Profile;
      }

      // 2. Profile row does not exist -> Auto-create / Upsert
      console.log(`[AuthContext] ⚠️ No profile row found for ${authUser.id}. Auto-creating via upsert...`);
      const refCode = `LU${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(1000 + Math.random() * 9000)}`;
      const newProfileData = {
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Member',
        is_admin: false,
        status: 'none' as const,
        reference_code: refCode,
      };

      console.log('[AuthContext] 📤 Upsert payload:', newProfileData);
      const { data: upsertData, error: upsertError } = await supabase
        .from('profiles')
        .upsert(newProfileData, { onConflict: 'id' })
        .select('*')
        .maybeSingle();

      if (upsertError) {
        console.error('[AuthContext] ❌ Upsert profile failed:', {
          message: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          hint: upsertError.hint,
        });

        // Retry SELECT once (in case a DB trigger just inserted it or there was a concurrent write)
        const { data: retryData, error: retryError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (retryData) {
          console.log('[AuthContext] ✅ Profile retrieved on retry SELECT:', retryData);
          return retryData as Profile;
        }
        if (retryError) {
          console.error('[AuthContext] ❌ Retry SELECT also failed:', retryError);
        }
        return null;
      }

      console.log('[AuthContext] ✅ Profile auto-created successfully:', upsertData);
      return upsertData as Profile;
    } catch (err: any) {
      console.error('[AuthContext] ❌ Unexpected exception in fetchOrCreateProfile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    if (user) {
      console.log('[AuthContext] 🔄 refreshProfile called for user:', user.id);
      const prof = await fetchOrCreateProfile(user);
      if (prof) setProfile(prof);
      return prof;
    }
    return null;
  }, [user, fetchOrCreateProfile]);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      console.log('[AuthContext] 🔄 initAuth: checking initial session via supabase.auth.getSession()...');
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[AuthContext] ❌ getSession returned error:', error);
        }

        console.log('[AuthContext] 📋 getSession result:', {
          hasSession: !!data?.session,
          userId: data?.session?.user?.id,
          email: data?.session?.user?.email,
        });

        if (!mounted) return;

        const currentSession = data?.session ?? null;
        const currentUser = currentSession?.user ?? null;

        setSession(currentSession);
        setUser(currentUser);

        if (currentUser) {
          console.log('[AuthContext] User found in session, loading profile...');
          const prof = await fetchOrCreateProfile(currentUser);
          if (mounted && prof) {
            setProfile(prof);
          }
        } else {
          if (mounted) {
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('[AuthContext] ❌ initAuth exception:', err);
      } finally {
        if (mounted) {
          console.log('[AuthContext] 🏁 initAuth finished. Setting loading = false');
          setLoading(false);
        }
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log(`[AuthContext] 🔔 onAuthStateChange: ${event}`, {
          hasSession: !!newSession,
          userId: newSession?.user?.id,
          email: newSession?.user?.email,
        });

        if (!mounted) return;

        const currentAuthUser = newSession?.user ?? null;
        setSession(newSession);
        setUser(currentAuthUser);

        if (currentAuthUser) {
          const prof = await fetchOrCreateProfile(currentAuthUser);
          if (mounted && prof) {
            setProfile(prof);
          }
        } else {
          if (mounted) {
            setProfile(null);
          }
        }

        if (mounted) {
          setLoading(false);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    initAuth();
  }, [fetchOrCreateProfile]);

  // Sign In function with full role and profile return
  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    console.log('[AuthContext] 🔑 signIn initiated for email:', email.trim());
    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error('[AuthContext] ❌ signInWithPassword failed:', error.message);
        setLoading(false);
        const mapped = mapAuthError(error.message, 'login');
        return { error: mapped.message, unconfirmedEmail: mapped.unconfirmedEmail };
      }

      console.log('[AuthContext] ✅ signInWithPassword succeeded. User ID:', data.user?.id);
      setSession(data.session);
      setUser(data.user);

      let prof: Profile | null = null;
      if (data.user) {
        prof = await fetchOrCreateProfile(data.user);
        if (prof) {
          setProfile(prof);
        }
      }

      setLoading(false);
      return { user: data.user, profile: prof };
    } catch (err: any) {
      console.error('[AuthContext] ❌ Unexpected signIn error:', err);
      setLoading(false);
      return { error: 'Something went wrong. Please try again.' };
    }
  };

  // Sign Up function
  const signUp = async (email: string, password: string, fullName?: string): Promise<SignUpResult> => {
    const cleanEmail = email.trim();
    console.log('[AuthContext] 📝 signUp initiated for email:', cleanEmail);
    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName || cleanEmail.split('@')[0],
          },
        },
      });

      if (error) {
        console.error('[AuthContext] ❌ signUp failed:', error.message);
        setLoading(false);
        return { error: mapAuthError(error.message, 'signup').message };
      }

      // Supabase returns an empty identities array when email is already registered (confirm email ON)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0 && !data.session) {
        console.warn('[AuthContext] ⚠️ Existing email detected during signUp');
        setLoading(false);
        return { error: 'This email is already registered. Try logging in.' };
      }

      console.log('[AuthContext] ✅ signUp succeeded. User ID:', data.user?.id, 'Session present:', !!data.session);

      if (!data.session) {
        setLoading(false);
        return { session: false, user: data.user ?? null };
      }

      if (data.user) {
        setSession(data.session);
        setUser(data.user);

        // Fetch or auto-create profile
        const prof = await fetchOrCreateProfile(data.user);
        if (prof) setProfile(prof);
      }

      setLoading(false);
      return { session: true, user: data.user ?? null };
    } catch (err: any) {
      console.error('[AuthContext] ❌ Unexpected signUp error:', err);
      setLoading(false);
      return { error: 'Something went wrong. Please try again.' };
    }
  };

  // Resend confirmation email
  const resendConfirmationEmail = async (email: string): Promise<{ error?: string }> => {
    const cleanEmail = email.trim();
    console.log('[AuthContext] ✉️ Resending confirmation email to:', cleanEmail);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });
      if (error) {
        console.error('[AuthContext] ❌ resend failed:', error.message);
        return { error: mapAuthError(error.message, 'resend').message };
      }
      return {};
    } catch (err: any) {
      console.error('[AuthContext] ❌ Unexpected resend error:', err);
      return { error: 'Something went wrong. Please try again.' };
    }
  };

  // Sign Out function
  const signOut = async () => {
    console.log('[AuthContext] 🚪 signOut requested');
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[AuthContext] ❌ Error during signOut:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
      setLoading(false);
      console.log('[AuthContext] 🚪 Sign out complete, state cleared');
    }
  };

  // Change Password
  const updatePassword = async (newPassword: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: mapAuthError(error.message, 'signup').message };
      return {};
    } catch {
      return { error: 'Something went wrong. Please try again.' };
    }
  };

  const isAdmin = Boolean(profile?.is_admin);
  const isApproved = Boolean(profile?.status === 'approved' || profile?.is_admin);
  const status: UserStatus = profile?.status || 'none';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isAdmin,
        isApproved,
        status,
        signIn,
        signUp,
        resendConfirmationEmail,
        signOut,
        refreshProfile,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
