/*
  # Email verification enhancement

  1. New Fields
    - Add `magic_token` column to email_verifications table for storing magic link tokens
    - Add `email` column to email_verifications table to store recipient email
    - Add `email_verified` column to users table to track verification status
    
  2. Indexes
    - Add index on magic_token for faster lookups
    - Add index on email for faster lookups
    
  3. Security
    - Add policies for verification status checks
*/

-- Add magic_token column to email_verifications table
ALTER TABLE IF EXISTS email_verifications
ADD COLUMN IF NOT EXISTS magic_token TEXT;

-- Add email column to email_verifications table
ALTER TABLE IF EXISTS email_verifications
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add email_verified column to users table
ALTER TABLE IF EXISTS users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Add index on magic_token for faster lookups
CREATE INDEX IF NOT EXISTS email_verifications_magic_token_idx ON email_verifications(magic_token);

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS email_verifications_email_idx ON email_verifications(email);

-- Create policy to allow public to check verification status (using PL/pgSQL to check existence first)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'email_verifications' 
    AND policyname = 'Public can check verification status'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can check verification status" ON email_verifications
             FOR SELECT TO public
             USING (true)';
  END IF;
END $$;

-- Update policy for users to check if they're verified (using PL/pgSQL to check existence first)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Users can see if they are verified'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can see if they are verified" ON users
             FOR SELECT TO authenticated
             USING (id = auth.uid())';
  END IF;
END $$;