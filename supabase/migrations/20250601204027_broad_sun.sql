-- Create tables for secure password reset system
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  user_email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_token_idx ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS password_reset_tokens_email_idx ON password_reset_tokens(user_email);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_idx ON password_reset_tokens(expires_at);

CREATE TABLE IF NOT EXISTS password_reset_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  success BOOLEAN DEFAULT FALSE,
  user_agent TEXT,
  referrer TEXT
);

CREATE INDEX IF NOT EXISTS password_reset_attempts_email_idx ON password_reset_attempts(email);
CREATE INDEX IF NOT EXISTS password_reset_attempts_time_idx ON password_reset_attempts(attempted_at);

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_tokens() RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < NOW() AND used_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if reset attempt is within rate limits
CREATE OR REPLACE FUNCTION check_password_reset_rate_limit(check_email TEXT) RETURNS BOOLEAN AS $$
DECLARE
  recent_attempts INTEGER;
BEGIN
  -- Count attempts in the last hour
  SELECT COUNT(*) 
  INTO recent_attempts 
  FROM password_reset_attempts
  WHERE email = check_email AND attempted_at > NOW() - INTERVAL '1 hour';
  
  -- Return true if under limit, false if rate limited
  RETURN recent_attempts < 3;
END;
$$ LANGUAGE plpgsql;

-- Add RLS to secure these tables
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage these tables
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

-- Allow users to only see their own tokens (for verification/status pages)
CREATE POLICY "Users can see their own password reset tokens"
ON password_reset_tokens
FOR SELECT
TO authenticated
USING (user_email = auth.email());