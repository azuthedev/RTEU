/*
  # Implement case-insensitive email lookups

  1. New Functions
    - Add `normalize_email` function to standardize email format
    - Add `find_user_by_email` function for case-insensitive lookups
    
  2. Changes
    - Create index for case-insensitive email lookups
    - Add helper functions for email normalization
    
  This migration improves email lookup reliability by ensuring case-insensitive matching
  and proper handling of URL-encoded email addresses.
*/

-- Create a function to normalize email addresses
CREATE OR REPLACE FUNCTION normalize_email(email TEXT) 
RETURNS TEXT AS $$
BEGIN
  -- Convert to lowercase, trim whitespace, and replace URL-encoded @ symbol
  RETURN lower(trim(replace(email, '%40', '@')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to find users by email in a case-insensitive way
CREATE OR REPLACE FUNCTION find_user_by_email(search_email TEXT) 
RETURNS SETOF users AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM users
  WHERE lower(email) = lower(normalize_email(search_email));
END;
$$ LANGUAGE plpgsql STABLE;

-- Create a case-insensitive index on the email column
CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

-- Add a comment explaining the purpose of these functions
COMMENT ON FUNCTION normalize_email(TEXT) IS 'Normalizes email addresses by converting to lowercase, trimming whitespace, and replacing URL-encoded characters';
COMMENT ON FUNCTION find_user_by_email(TEXT) IS 'Finds users by email in a case-insensitive way';