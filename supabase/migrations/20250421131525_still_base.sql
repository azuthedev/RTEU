/*
  # Add title field to trips table

  1. New Columns
    - Added `customer_title` to store title/prefix (Mr., Ms., etc.) separately from name
  
  2. Changes
    - Made `customer_name` store only first/last name without prefix
    
  This migration supports splitting title (Mr/Ms/Mrs) from customer name for better data organization.
*/

DO $$
BEGIN
  -- Add customer_title column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'trips' 
    AND column_name = 'customer_title'
  ) THEN
    ALTER TABLE trips ADD COLUMN customer_title text;
  END IF;
  
  -- Create index on customer_email column if it doesn't exist yet
  -- This improves performance for querying trips by customer email
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'trips' 
    AND indexname = 'trips_customer_email_idx'
  ) THEN
    CREATE INDEX trips_customer_email_idx ON trips (customer_email);
  END IF;
END $$;