import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Mail, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import Header from '../components/Header';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const { trackEvent } = useAnalytics();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [emailConflict, setEmailConflict] = useState<{ email: string } | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the auth mode from the URL (login or signup)
        const authMode = searchParams.get('auth_mode') || 'login';
        const redirectTo = searchParams.get('redirect_to') || '/';
        
        // Check if there's an error in the URL
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (errorParam) {
          setError(`${errorParam}: ${errorDescription || 'Unknown error'}`);
          trackEvent('Authentication', 'OAuth Callback Error', errorParam);
          setProcessing(false);
          return;
        }

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          // Check for email already registered error
          if (sessionError.message?.toLowerCase().includes('email already registered') || 
              sessionError.message?.toLowerCase().includes('user already registered') ||
              sessionError.message?.toLowerCase().includes('account already exists')) {
            
            // Try to extract the email from the error message
            const emailMatch = sessionError.message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
            const email = emailMatch ? emailMatch[0] : '';
            
            console.log('Email conflict detected:', email);
            setEmailConflict({ email });
            setProcessing(false);
            
            trackEvent('Authentication', 'OAuth Email Conflict', email);
            return;
          }
          
          throw sessionError;
        }

        if (!session) {
          throw new Error('No session found after OAuth login');
        }

        // Track successful authentication
        trackEvent('Authentication', `Google ${authMode === 'signup' ? 'Sign Up' : 'Sign In'} Success`);
        
        // Refresh session to update JWT claims
        await refreshSession();
        
        // Update success state
        setSuccess(true);
        setProcessing(false);
        
        // Redirect after a short delay to show success state
        setTimeout(() => {
          navigate(redirectTo, { replace: true });
        }, 1500);
      } catch (error) {
        console.error('Error handling auth callback:', error);
        setError(error.message || 'An error occurred during authentication');
        setProcessing(false);
        trackEvent('Authentication', 'OAuth Callback Error', error.message);
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, refreshSession, trackEvent]);

  const handleLoginWithPassword = () => {
    if (emailConflict) {
      navigate('/login', { 
        state: { 
          prefillEmail: emailConflict.email,
          emailConflictMessage: 'We found an existing account with this email. Please sign in with your password.'
        }
      });
      trackEvent('Authentication', 'Email Conflict - Login Redirect');
    }
  };

  const handlePasswordReset = () => {
    if (emailConflict) {
      navigate('/login', { 
        state: { 
          prefillEmail: emailConflict.email,
          showPasswordReset: true,
          emailConflictMessage: 'We found an existing account with this email. You can reset your password if needed.'
        }
      });
      trackEvent('Authentication', 'Email Conflict - Password Reset Redirect');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header hideSignIn />
      
      <main className="pt-32 pb-16 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          {processing ? (
            <>
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Completing Authentication</h1>
              <p className="text-gray-600">Please wait while we complete your authentication...</p>
            </>
          ) : emailConflict ? (
            <>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Account Already Exists</h1>
              <p className="text-gray-600 mb-4">
                An account with the email <span className="font-semibold">{emailConflict.email}</span> already exists.
              </p>
              <p className="text-gray-600 mb-6">
                You can sign in with your existing password or reset it if you've forgotten it.
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={handleLoginWithPassword}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  Sign in with Password
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
                
                <button
                  onClick={handlePasswordReset}
                  className="w-full border border-blue-600 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </>
          ) : error ? (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Authentication Failed</h1>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => navigate('/login')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Return to Login
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Authentication Successful</h1>
              <p className="text-gray-600 mb-4">You have been successfully authenticated.</p>
              <p className="text-gray-600">Redirecting you...</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AuthCallback;