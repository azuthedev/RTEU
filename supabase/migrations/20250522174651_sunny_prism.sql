/*
  # Email verification enhancements
  
  1. New Columns
    - Add `magic_token` column to `email_verifications` table for magic link support
    - Add `email` column to `email_verifications` table to support non-registered users
    - Add `email_verified` column to `users` table to track verification status
    
  2. Indexes
    - Add indexes on `magic_token`, `email`, and `verified` fields for faster lookups
    
  3. Security
    - Add policies for verification access control
*/

-- Add magic_token column to email_verifications table
ALTER TABLE email_verifications
ADD COLUMN IF NOT EXISTS magic_token TEXT;

-- Add email column to email_verifications table
ALTER TABLE email_verifications
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add email_verified column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Add index on magic_token for faster lookups
CREATE INDEX IF NOT EXISTS email_verifications_magic_token_idx ON email_verifications(magic_token);

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS email_verifications_email_idx ON email_verifications(email);

-- Add index on verified for faster lookups
CREATE INDEX IF NOT EXISTS email_verifications_verified_idx ON email_verifications(verified);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can check verification status" ON email_verifications;
DROP POLICY IF EXISTS "Users can see if they are verified" ON users;

-- Create policy for public to check verification status
CREATE POLICY "Public can check verification status" ON email_verifications
FOR SELECT TO public
USING (true);

-- Create policy for users to check if they are verified
CREATE POLICY "Users can see if they are verified" ON users
FOR SELECT TO authenticated
USING (id = auth.uid());