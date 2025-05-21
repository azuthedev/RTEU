/*
  # Add email verification functionality

  1. Updates:
    - Email Verifications Table:
      - Add `verified` column (boolean, default false) - track if OTP is used
      - Ensure proper expiry tracking with `expires_at` column
      - Add indexes for performance

  2. Security:
    - Enable row level security
    - Add policy to ensure users can only see their own verifications

  3. Constraints:
    - Ensure unique tokens
    - Add cascading delete if user is deleted
*/

-- Make sure the email_verifications table has all required columns and indexes
DO $$
BEGIN
  -- Add verified column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'email_verifications'
    AND column_name = 'verified'
  ) THEN
    ALTER TABLE email_verifications 
    ADD COLUMN verified BOOLEAN DEFAULT false;
  END IF;

  -- Ensure expires_at column exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'email_verifications'
    AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE email_verifications 
    ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE NOT NULL;
  END IF;

  -- Ensure token column exists and is not null
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'email_verifications'
    AND column_name = 'token'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE email_verifications 
    ALTER COLUMN token SET NOT NULL;
  END IF;

  -- Add unique constraint on token if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_verifications_token_key'
  ) THEN
    ALTER TABLE email_verifications
    ADD CONSTRAINT email_verifications_token_key UNIQUE (token);
  END IF;
  
  -- Add index on user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'email_verifications'
    AND indexname = 'email_verifications_user_id_idx'
  ) THEN
    CREATE INDEX email_verifications_user_id_idx ON email_verifications (user_id);
  END IF;

  -- Add index on expires_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'email_verifications'
    AND indexname = 'email_verifications_expires_at_idx'
  ) THEN
    CREATE INDEX email_verifications_expires_at_idx ON email_verifications (expires_at);
  END IF;

  -- Add index on verified if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'email_verifications'
    AND indexname = 'email_verifications_verified_idx'
  ) THEN
    CREATE INDEX email_verifications_verified_idx ON email_verifications (verified);
  END IF;

  -- Ensure foreign key constraint on user_id exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_verifications_user_id_fkey'
  ) THEN
    ALTER TABLE email_verifications
    ADD CONSTRAINT email_verifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS on email_verifications table
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own verifications" ON email_verifications;
  
  -- Create policy for users to view their own verifications
  CREATE POLICY "Users can view their own verifications"
  ON email_verifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
END $$;

-- Add scheduled cleanup function for expired tokens (optional)
CREATE OR REPLACE FUNCTION cleanup_expired_verifications() RETURNS void AS $$
BEGIN
  DELETE FROM email_verifications
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- You can schedule this to run periodically using pgAgent or a similar tool
COMMENT ON FUNCTION cleanup_expired_verifications() IS 'Removes expired email verification tokens';