import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { sendOtpEmail, checkEmailVerification as checkEmailVerificationUtil } from '../utils/emailValidator';
import { normalizeEmail } from '../utils/emailNormalizer';

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
    error?: string,
    rateLimitExceeded?: boolean,
    nextAllowedAttempt?: string
  }>;
  resetPassword: (password: string, token: string, email: string) => Promise<{ 
    success: boolean, 
    error?: string 
  }>;
  verifyPasswordResetToken: (token: string) => Promise<{
    valid: boolean,
    email?: string,
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

  // Helper function to get the correct API URL based on environment
  const getApiUrl = (endpoint: string): string => {
    if (isDevEnvironment.current) {
      // Use proxy URL in development
      return `/api/${endpoint}`;
    } else {
      // Use direct Supabase URL in production
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      return `${supabaseUrl}/functions/v1/${endpoint}`;
    }
  };

  // Helper function to get headers for API requests
  const getApiHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
    };

    const webhookSecret = import.meta.env.VITE_WEBHOOK_SECRET;
    if (webhookSecret) {
      headers['X-Auth'] = webhookSecret;
    }

    return headers;
  };

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
      
      // Normalize email
      const normalizedEmail = normalizeEmail(email);
      
      // Track signup attempt
      trackEvent('Authentication', 'Sign Up Attempt', inviteCode ? 'With Invite' : 'Standard');
      
      // Log for debugging
      console.log('Signup with invite code:', inviteCode);
      console.log('Using normalized email:', normalizedEmail);
      
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
        email: normalizedEmail,
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
      
      // Normalize email
      const normalizedEmail = normalizeEmail(email);
      
      // Track sign in attempt
      trackEvent('Authentication', 'Sign In Attempt');
      
      console.log('Attempting sign in with normalized email:', normalizedEmail);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: normalizedEmail, 
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
      // Normalize email
      const normalizedEmail = normalizeEmail(email);
      
      trackEvent('Authentication', 'Send Verification Email Attempt', normalizedEmail);
      
      // Use the dedicated function to send OTP email
      const result = await sendOtpEmail(normalizedEmail, name);
      
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
      // Normalize email
      const normalizedEmail = normalizeEmail(email);
      
      // Use the utility function from emailValidator.ts
      return await checkEmailVerificationUtil(normalizedEmail);
    } catch (err: any) {
      console.error('Error checking email verification:', err);
      
      // In development environment, provide fallback values
      if (isDevEnvironment.current) {
        console.log('DEVELOPMENT FALLBACK: Simulating email verification check for', normalizedEmail);
        
        // Some test emails to demonstrate different states
        const testCases: Record<string, { verified: boolean, exists: boolean, requiresVerification: boolean }> = {
          'verified@example.com': { verified: true, exists: true, requiresVerification: false },
          'unverified@example.com': { verified: false, exists: true, requiresVerification: true },
          'admin@example.com': { verified: true, exists: true, requiresVerification: false }
        };
        
        const emailKey = normalizedEmail.toLowerCase();
        if (testCases[emailKey]) {
          console.log(`DEVELOPMENT MODE: Using predefined test case for ${normalizedEmail}`);
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

  // Request a password reset - Let Edge Function handle user existence check
  const requestPasswordReset = async (email: string): Promise<{
    success: boolean,
    error?: string,
    rateLimitExceeded?: boolean,
    nextAllowedAttempt?: string
  }> => {
    try {
      // Ensure email is properly normalized
      const normalizedEmail = normalizeEmail(email);
      console.log(`[Password Reset] Requesting reset for email: "${normalizedEmail}"`);
      
      trackEvent('Authentication', 'Password Reset Request Initiated', normalizedEmail);
      
      // Set default user name fallback - Edge Function will try to fetch actual name
      const userName = normalizedEmail.split('@')[0];
      
      // Set to production URL
      const productionDomain = 'https://royaltransfereu.com';
      
      // Get API URL and headers using helper functions
      const apiUrl = getApiUrl('email-webhook');
      const headers = getApiHeaders();
      
      console.log(`[Password Reset] Using API URL: ${apiUrl}`);
      
      console.log(`[Password Reset] Calling Edge Function for: "${normalizedEmail}"`);
      
      // Send password reset request
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: userName, // Fallback name - Edge Function will try to fetch actual name
          email: normalizedEmail.trim(), // Ensure email is trimmed
          reset_link: productionDomain, // Base URL - Edge Function will generate complete link
          email_type: 'PWReset'
        })
      });
      
      console.log(`[Password Reset] Edge function response status:`, response.status);
      
      // Check for rate limiting response (status 429)
      if (response.status === 429) {
        let rateLimitData;
        try {
          const responseText = await response.text();
          rateLimitData = responseText ? JSON.parse(responseText) : {};
        } catch (jsonError) {
          console.error('[Password Reset] Failed to parse rate limit response:', jsonError);
          rateLimitData = {};
        }
        
        console.log(`[Password Reset] Rate limit exceeded:`, rateLimitData);
        
        return { 
          success: false,
          error: 'Too many password reset attempts. Please try again later.',
          rateLimitExceeded: true,
          nextAllowedAttempt: rateLimitData.nextAllowedAttempt
        };
      }
      
      if (!response.ok) {
        let errorMessage = 'Failed to send password reset email';
        
        try {
          // First try to get the response as text
          const responseText = await response.text();
          console.log('[Password Reset] Raw error response:', responseText);
          
          if (responseText) {
            try {
              // Try to parse as JSON
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
              // If JSON parsing fails, use the raw text as error message
              console.log('[Password Reset] Response is not JSON, using raw text');
              errorMessage = responseText;
            }
          }
        } catch (textError) {
          console.error('[Password Reset] Failed to read response body:', textError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        console.error('[Password Reset] Edge function response error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      console.log(`[Password Reset] Reset email sent successfully to: "${normalizedEmail}"`);
      trackEvent('Authentication', 'Password Reset Email Sent', normalizedEmail);
      return { success: true };
    } catch (err: any) {
      console.error('[Password Reset] Error in password reset request:', err);
      trackEvent('Authentication', 'Password Reset Request Error', err.message);
      return { 
        success: false, 
        error: err.message || 'Failed to process password reset request'
      };
    }
  };

  // Verify a password reset token
  const verifyPasswordResetToken = async (token: string): Promise<{
    valid: boolean,
    email?: string,
    error?: string
  }> => {
    try {
      trackEvent('Authentication', 'Verify Password Reset Token');
      
      console.log(`[Token Verification] Verifying token: ${token}`);
      
      // Get API URL and headers using helper functions
      const apiUrl = getApiUrl('verify-reset-token');
      const headers = getApiHeaders();
      
      console.log(`[Token Verification] Using API URL: ${apiUrl}`);
      
      // Verify the token via Edge Function
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          token: token,
          action: 'verify'
        })
      });
      
      console.log(`[Token Verification] Response status: ${response.status}`);
      
      if (!response.ok) {
        let errorMessage = 'Invalid or expired token';
        
        try {
          const responseText = await response.text();
          console.log('[Token Verification] Raw error response:', responseText);
          
          if (responseText) {
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
              errorMessage = responseText;
            }
          }
        } catch (textError) {
          console.error('[Token Verification] Failed to read response body:', textError);
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log(`[Token Verification] Response data:`, data);
      
      // Return token verification result
      return {
        valid: data.valid,
        email: data.email,
        error: data.error
      };
    } catch (err: any) {
      console.error('Error verifying password reset token:', err);
      
      // For development, provide a fallback
      if (isDevEnvironment.current) {
        console.log('DEVELOPMENT MODE: Simulating token verification');
        
        // In dev mode, accept a specific test token
        if (token === 'test-token') {
          return {
            valid: true,
            email: 'test@example.com'
          };
        }
      }
      
      return { 
        valid: false, 
        error: err.message || 'Failed to verify token'
      };
    }
  };

  // Reset password with token
  const resetPassword = async (password: string, token: string, email: string): Promise<{ 
    success: boolean, 
    error?: string 
  }> => {
    try {
      // Normalize email
      const normalizedEmail = normalizeEmail(email);
      
      trackEvent('Authentication', 'Password Reset Attempt');
      
      console.log(`[Password Reset] Resetting password for email: "${normalizedEmail}" with token: ${token}`);
      
      // Get API URL and headers using helper functions
      const apiUrl = getApiUrl('reset-password');
      const headers = getApiHeaders();
      
      console.log(`[Password Reset] Using API URL: ${apiUrl}`);
      
      // Reset password via Edge Function
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: normalizedEmail,
          password: password,
          token: token
        })
      });
      
      console.log(`[Password Reset] Response status: ${response.status}`);
      
      if (!response.ok) {
        let errorMessage = 'Failed to reset password';
        
        try {
          const responseText = await response.text();
          console.log('[Password Reset] Raw error response:', responseText);
          
          if (responseText) {
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
              errorMessage = responseText;
            }
          }
        } catch (textError) {
          console.error('[Password Reset] Failed to read response body:', textError);
        }
        
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log(`[Password Reset] Response data:`, responseData);
      
      // Consume the token to prevent reuse
      const consumeUrl = getApiUrl('verify-reset-token');
      await fetch(consumeUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          token: token,
          action: 'consume'
        })
      });
      
      trackEvent('Authentication', 'Password Reset Success');
      return { success: true };
    } catch (err: any) {
      console.error('Error in password reset:', err);
      trackEvent('Authentication', 'Password Reset Error', err.message);
      
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
    resetPassword,
    verifyPasswordResetToken
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
