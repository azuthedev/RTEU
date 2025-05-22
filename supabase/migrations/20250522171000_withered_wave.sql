/*
  # Add email verification fields and policies

  1. Schema Changes
    - Add `magic_token` TEXT column to `email_verifications` table
    - Add `email` TEXT column to `email_verifications` table  
    - Add `email_verified` BOOLEAN column to `users` table with default FALSE
    - Add indexes for faster lookups on verification fields
  2. Security
    - Add policy for public access to check verification status
    - Add policy for users to check their own verification status
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

-- Create policy for public to check verification status (with proper syntax)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'email_verifications' 
    AND policyname = 'Public can check verification status'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can check verification status" ON email_verifications FOR SELECT TO public USING (true)';
  END IF;
END $$;

-- Create policy for users to check if they're verified (with proper syntax)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Users can see if they are verified'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can see if they are verified" ON users FOR SELECT TO authenticated USING (id = auth.uid())';
  END IF;
END $$;