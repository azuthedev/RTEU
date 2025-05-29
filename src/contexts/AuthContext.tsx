import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { sendOtpEmail, checkEmailVerification as checkEmailVerificationUtil } from '../utils/emailValidator';

type UserData = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  emailVerified: boolean;
  emailVerificationChecked: boolean;
  signUp: (email: string, password: string, name: string, phone?: string, inviteCode?: string) => Promise<{ error: Error | null, data?: { user: User | null } }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null, session: Session | null }>;
  signOut: () => Promise<void>;
  updateUserData: (updates: Partial<Omit<UserData, 'id' | 'email' | 'created_at'>>) => 
    Promise<{ error: Error | null, data: UserData | null }>;
  sendVerificationEmail: (email: string, name?: string) => Promise<{ 
    success: boolean,
    verificationId?: string,
    error?: string
  }>;
  checkEmailVerification: (email: string) => Promise<{
    verified: boolean,
    exists: boolean,
    requiresVerification: boolean,
    hasPendingVerification?: boolean,
    verificationAge?: number,
    error?: string
  }>;
  refreshSession: () => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<{ 
    success: boolean, 
    error?: string 
  }>;
  resetPassword: (password: string, token: string) => Promise<{ 
    success: boolean, 
    error?: string 
  }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  trackEvent: (category: string, action: string, label?: string, value?: number, nonInteraction?: boolean) => void;
  setUserId: (id: string) => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, trackEvent, setUserId }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationChecked, setEmailVerificationChecked] = useState(false);
  const initialStateLoadedRef = useRef(false);
  const authStateChangeSubscribed = useRef(false);
  const isDevEnvironment = useRef(
    typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname.includes('local-credentialless') ||
      window.location.hostname.includes('webcontainer')
    )
  );

  // Function to fetch user data
  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return null;
      }

      setUserData(data);
      setEmailVerified(!!data.email_verified);
      setEmailVerificationChecked(true);
      
      return data;
    } catch (error) {
      console.error('Unexpected error fetching user data:', error);
      return null;
    }
  };

  // Refresh session to update JWT claims
  const refreshSession = async (): Promise<boolean> => {
    try {
      const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !newSession) {
        console.error('Error refreshing session:', refreshError);
        return false;
      }
      
      setSession(newSession);
      setUser(newSession.user);
      
      return true;
    } catch (error) {
      console.error('Unexpected error refreshing session:', error);
      return false;
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get session with JWT claims
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Track signed in user
          setUserId(currentSession.user.id);
          
          // Fetch user data and update JWT claims if needed
          const userData = await fetchUserData(currentSession.user.id);
          if (userData?.user_role) {
            // Set user properties in GA
            trackEvent('Authentication', 'Auto Sign In', userData.user_role);
            
            // Refresh session to get updated JWT claims
            await refreshSession();
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
        initialStateLoadedRef.current = true;
      }
    };

    initializeAuth();
  }, [setUserId, trackEvent]);

  // Listen for auth changes
  useEffect(() => {
    if (!initialStateLoadedRef.current || authStateChangeSubscribed.current) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state change:', event);
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setSession(null);
        setUser(null);
        setUserData(null);
        setEmailVerified(false);
        setEmailVerificationChecked(false);
        
        // Track sign out in GA
        trackEvent('Authentication', 'Sign Out');
        setUserId(''); // Clear the user ID
      } else if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        
        // Track event in GA
        if (event === 'SIGNED_IN') {
          trackEvent('Authentication', 'Sign In Success');
          setUserId(currentSession.user.id);
        }
        
        if (!userData || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          const userData = await fetchUserData(currentSession.user.id);
          
          if (userData?.user_role) {
            // Track user role
            trackEvent('Authentication', 'User Role', userData.user_role);
            
            // Refresh session to get updated JWT claims
            await refreshSession();
          }
        }
      }

      setLoading(false);
    });

    authStateChangeSubscribed.current = true;

    return () => {
      subscription.unsubscribe();
      authStateChangeSubscribed.current = false;
    };
  }, [userData, trackEvent, setUserId]);

  const signUp = async (email: string, password: string, name: string, phone?: string, inviteCode?: string) => {
    try {
      setLoading(true);
      
      // Track signup attempt
      trackEvent('Authentication', 'Sign Up Attempt', inviteCode ? 'With Invite' : 'Standard');
      
      // Log for debugging
      console.log('Signup with invite code:', inviteCode);
      
      // Check invite code validity first if provided
      let inviteData = null;
      if (inviteCode) {
        try {
          const { data, error } = await supabase
            .from('invite_links')
            .select('*')
            .eq('code', inviteCode)
            .eq('status', 'active')
            .single();
            
          if (error) {
            console.error('Error validating invite code:', error);
            
            // In development, create mock invite data for testing
            if (isDevEnvironment.current) {
              console.log('DEVELOPMENT MODE: Using mock invite data');
              inviteData = {
                id: 'dev-' + Date.now(),
                role: 'customer',
                status: 'active'
              };
            } else {
              trackEvent('Authentication', 'Sign Up Error', 'Invalid invite code');
              throw new Error('Invalid or expired invite code');
            }
          } else {
            if (data.expires_at && new Date(data.expires_at) < new Date()) {
              // Mark as expired
              try {
                const { error: updateError } = await supabase
                  .from('invite_links')
                  .update({ status: 'expired' })
                  .eq('id', data.id);
                
                if (updateError) console.error('Error updating invite status:', updateError);
              } catch (err) {
                console.error('Error updating invite status:', err);
              }
              
              if (isDevEnvironment.current) {
                console.log('DEVELOPMENT MODE: Using mock invite data despite expiration');
                inviteData = {
                  id: 'dev-' + Date.now(),
                  role: 'customer',
                  status: 'active'
                };
              } else {
                trackEvent('Authentication', 'Sign Up Error', 'Expired invite code');
                throw new Error('This invite link has expired');
              }
            } else {
              inviteData = data;
            }
          }
        } catch (err) {
          if (isDevEnvironment.current) {
            console.log('DEVELOPMENT MODE: Using mock invite data despite error', err);
            inviteData = {
              id: 'dev-' + Date.now(),
              role: 'customer',
              status: 'active'
            };
          } else {
            throw err;
          }
        }
        
        console.log('Valid invite data:', inviteData);
      }
      
      // Create metadata object
      const metadata: Record<string, string | null> = {
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        email_verified: 'false' // Start with unverified
      };
      
      // Important: Add invite code to metadata if provided
      if (inviteCode) {
        metadata.invite = inviteCode.trim();
      }
      
      console.log('Signup metadata being sent:', metadata);
      
      // Call Supabase signup with the metadata
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        console.error('Supabase signup error:', error);
        trackEvent('Authentication', 'Sign Up Error', error.message);
        throw error;
      }
      
      if (!data.user) {
        trackEvent('Authentication', 'Sign Up Error', 'User creation failed');
        throw new Error('User creation failed');
      }
      
      // Track successful signup
      trackEvent('Authentication', 'Sign Up Success', inviteData?.role || 'customer');
      
      // Update invite link status if an invite code was used
      // NOTE: Using the authenticated user's context, not signing out
      if (inviteCode && inviteData && data.user) {
        try {
          const userId = data.user.id;
          console.log('Updating invite link status for new user:', userId);
          
          // Update the invite link status using the authenticated session
          const { error: updateError } = await supabase
            .from('invite_links')
            .update({ 
              status: 'used',
              used_at: new Date().toISOString(),
              used_by: userId
            })
            .eq('id', inviteData.id)
            .eq('status', 'active'); // Ensure we're only updating active invites
            
          if (updateError) {
            // Log the error but don't fail the signup
            console.error('Error updating invite link status:', updateError);
          } else {
            console.log('Successfully updated invite link status');
          }
          
          // If the invite specified a role, update the user's role
          if (inviteData.role) {
            console.log('Setting user role from invite:', inviteData.role);
            
            const { error: roleUpdateError } = await supabase
              .from('users')
              .update({ user_role: inviteData.role })
              .eq('id', userId);
              
            if (roleUpdateError) {
              console.error('Error updating user role:', roleUpdateError);
            } else {
              console.log('Successfully updated user role');
            }
          }
        } catch (updateError) {
          // Log the error but don't fail the signup
          console.error('Unexpected error updating invite status:', updateError);
        }
      }

      return { error: null, data };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Track sign in attempt
      trackEvent('Authentication', 'Sign In Attempt');
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        trackEvent('Authentication', 'Sign In Error', error.message);
        throw error;
      }

      // Track successful sign in
      trackEvent('Authentication', 'Sign In Success');
      
      // Immediately update local state
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        
        // Set user ID in GA
        setUserId(data.session.user.id);
        
        // Fetch user data
        const userData = await fetchUserData(data.session.user.id);
        
        if (userData?.user_role) {
          // Track user role
          trackEvent('Authentication', 'User Role', userData.user_role);
          
          // Refresh session to get updated JWT claims
          await refreshSession();
        }
      }
      
      return { error: null, session: data.session };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as Error, session: null };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Track sign out in GA
      trackEvent('Authentication', 'Sign Out Initiated');
      
      // First, sign out from Supabase to clear tokens
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Error during Supabase sign out:', error);
      }
      
      // Clear all local state
      setSession(null);
      setUser(null);
      setUserData(null);
      setEmailVerified(false);
      setEmailVerificationChecked(false);
      
      // Clear user ID in GA
      setUserId('');
      
      // Force navigation to home page and trigger a reload
      // This ensures all components get fresh state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserData = async (updates: Partial<Omit<UserData, 'id' | 'email' | 'created_at'>>) => {
    if (!user) {
      return { error: new Error('User not authenticated'), data: null };
    }

    try {
      // Track profile update attempt
      trackEvent('User', 'Profile Update Attempt');
      
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Track successful profile update
      trackEvent('User', 'Profile Update Success');
      
      setUserData(data);
      
      // Update email verification status if it was included in the update
      if ('email_verified' in updates) {
        setEmailVerified(!!updates.email_verified);
      }
      
      // Refresh session to update JWT claims if user_role was updated
      if ('user_role' in updates) {
        await refreshSession();
      }
      
      return { error: null, data };
    } catch (error) {
      console.error('Error updating user data:', error);
      // Track profile update error
      trackEvent('User', 'Profile Update Error', (error as Error).message);
      return { error: error as Error, data: null };
    }
  };

  // Send verification email with OTP
  const sendVerificationEmail = async (email: string, name?: string) => {
    try {
      trackEvent('Authentication', 'Send Verification Email Attempt', email);
      
      // Use the dedicated function to send OTP email
      const result = await sendOtpEmail(email, name);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send verification email');
      }
      
      trackEvent('Authentication', 'Send Verification Email Success');
      
      return {
        success: true,
        verificationId: result.verificationId
      };
    } catch (err: any) {
      console.error('Error sending verification email:', err);
      
      // In development environment, provide a fallback
      if (isDevEnvironment.current) {
        console.log('DEVELOPMENT MODE: Using mock verification');
        trackEvent('Authentication', 'Send Verification Email Dev Fallback');
        return {
          success: true,
          verificationId: `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`
        };
      }
      
      trackEvent('Authentication', 'Send Verification Email Error', err.message);
      
      return {
        success: false,
        error: err.message || 'Failed to send verification email'
      };
    }
  };
  
  // Check if an email has been verified
  const checkEmailVerificationStatus = async (email: string) => {
    try {
      // Use the utility function from emailValidator.ts
      return await checkEmailVerificationUtil(email);
    } catch (err: any) {
      console.error('Error checking email verification:', err);
      
      // In development environment, provide fallback values
      if (isDevEnvironment.current) {
        console.log('DEVELOPMENT MODE: Simulating email verification check for', email);
        
        // Some test emails to demonstrate different states
        const testCases: Record<string, { verified: boolean, exists: boolean, requiresVerification: boolean }> = {
          'verified@example.com': { verified: true, exists: true, requiresVerification: false },
          'unverified@example.com': { verified: false, exists: true, requiresVerification: true },
          'admin@example.com': { verified: true, exists: true, requiresVerification: false }
        };
        
        const emailKey = email.toLowerCase();
        if (testCases[emailKey]) {
          console.log(`DEVELOPMENT MODE: Using predefined test case for ${email}`);
          return testCases[emailKey];
        }
        
        return {
          verified: false,
          exists: false,
          requiresVerification: false
        };
      }
      
      return {
        verified: false,
        exists: false,
        requiresVerification: false,
        error: err.message || 'Failed to check verification status'
      };
    }
  };

  // Request a password reset
  const requestPasswordReset = async (email: string): Promise<{ 
    success: boolean, 
    error?: string 
  }> => {
    try {
      trackEvent('Authentication', 'Password Reset Request Initiated', email);
      
      // Following security best practices, we don't check if the user exists
      // This prevents user enumeration attacks
      
      // Generate a password reset token using Supabase Auth
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error('Error initiating password reset:', error);
        trackEvent('Authentication', 'Password Reset Error', error.message);
        throw new Error('Failed to send password reset email: ' + error.message);
      }
      
      // Also send a more customized email using our webhook
      try {
        await sendPasswordResetEmail(email, email);
      } catch (webhookError) {
        // Log but don't fail if the webhook fails - the Supabase email will still be sent
        console.warn('Failed to send custom reset email via webhook:', webhookError);
      }
      
      trackEvent('Authentication', 'Password Reset Email Sent', email);
      return { success: true };
    } catch (err: any) {
      console.error('Error in password reset request:', err);
      
      // In development, provide a fallback
      if (isDevEnvironment.current) {
        console.log('DEVELOPMENT MODE: Simulating successful password reset request');
        trackEvent('Authentication', 'Password Reset Dev Fallback');
        return { success: true };
      }
      
      return { 
        success: false, 
        error: err.message || 'Failed to process password reset request'
      };
    }
  };

  // Send password reset email via webhook
  const sendPasswordResetEmail = async (name: string, email: string): Promise<boolean> => {
    try {
      // Get webhook secret from environment
      const webhookSecret = import.meta.env.WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        console.error('Missing WEBHOOK_SECRET environment variable');
        
        // In development, just log and continue
        if (isDevEnvironment.current) {
          console.log('DEVELOPMENT MODE: Skipping webhook call - missing secret');
          return true;
        }
        
        return false;
      }
      
      // Generate reset link
      // Use Supabase's native password reset link mechanism
      const resetLink = `${window.location.origin}/reset-password`;
      
      // Call webhook
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth': webhookSecret
          },
          body: JSON.stringify({
            name: name,
            email: email,
            reset_link: resetLink,
            email_type: 'PWReset'
          })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Webhook error:', errorData);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error sending password reset email via webhook:', err);
      return false;
    }
  };

  // Reset password with token
  const resetPassword = async (password: string, token: string): Promise<{ 
    success: boolean, 
    error?: string 
  }> => {
    try {
      trackEvent('Authentication', 'Password Reset Attempt');
      
      // Update user's password using Supabase Auth API
      const { error } = await supabase.auth.updateUser({ 
        password 
      });
      
      if (error) {
        console.error('Error resetting password:', error);
        trackEvent('Authentication', 'Password Reset Error', error.message);
        throw new Error('Failed to reset password: ' + error.message);
      }
      
      trackEvent('Authentication', 'Password Reset Success');
      return { success: true };
    } catch (err: any) {
      console.error('Error in password reset:', err);
      
      // In development, provide a fallback
      if (isDevEnvironment.current) {
        console.log('DEVELOPMENT MODE: Simulating successful password reset');
        trackEvent('Authentication', 'Password Reset Dev Success');
        return { success: true };
      }
      
      return { 
        success: false, 
        error: err.message || 'Failed to reset password'
      };
    }
  };

  const value = {
    session,
    user,
    userData,
    loading,
    emailVerified,
    emailVerificationChecked,
    signUp,
    signIn,
    signOut,
    updateUserData,
    sendVerificationEmail,
    checkEmailVerification: checkEmailVerificationStatus,
    refreshSession,
    requestPasswordReset,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};