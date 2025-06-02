-- Create password reset tables and policies
-- This migration adds the necessary tables for the password reset system
-- Created: June 2, 2025

-- Create table for storing password reset tokens
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  user_email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for tracking password reset attempts (for rate limiting)
CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  success BOOLEAN DEFAULT FALSE,
  user_agent TEXT,
  referrer TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(user_email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_email_time ON password_reset_attempts(email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_ip ON password_reset_attempts(ip_address);

-- Enable Row Level Security
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for security
CREATE POLICY "Service role can manage password reset tokens" 
ON password_reset_tokens 
FOR ALL 
TO service_role 
USING (true);

CREATE POLICY "Service role can manage password reset attempts" 
ON password_reset_attempts 
FOR ALL 
TO service_role 
USING (true);

-- Create policy to allow users to only see their own tokens
CREATE POLICY "Users can see their own password reset tokens"
ON password_reset_tokens
FOR SELECT
TO authenticated
USING (user_email = auth.email());

-- Create utility function for cleaning up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_tokens() 
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < NOW() AND used_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION check_password_reset_rate_limit(check_email TEXT) 
RETURNS BOOLEAN AS $$
DECLARE
  recent_attempts INTEGER;
BEGIN
  -- Count attempts in the last hour
  SELECT COUNT(*) 
  INTO recent_attempts 
  FROM password_reset_attempts
  WHERE email = check_email AND attempted_at > NOW() - INTERVAL '1 hour';
  
  -- Return true if under limit (3 attempts per hour), false if rate limited
  RETURN recent_attempts < 3;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens for user authentication';
COMMENT ON TABLE password_reset_attempts IS 'Tracks password reset attempts for rate limiting and security';
COMMENT ON FUNCTION cleanup_expired_password_tokens() IS 'Removes expired password reset tokens';
COMMENT ON FUNCTION check_password_reset_rate_limit(TEXT) IS 'Checks if a user has exceeded password reset rate limits';