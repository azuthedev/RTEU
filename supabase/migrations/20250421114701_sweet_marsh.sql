/*
  # Add passengers column to trips table

  1. Changes
    - Add `passengers` integer column to `trips` table with default value of 1
    
  2. Fixes
    - Resolves the error "Could not find the 'passengers' column of 'trips' in the schema cache"
    - Allows tracking the number of passengers for each trip
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'trips' 
    AND column_name = 'passengers'
  ) THEN
    ALTER TABLE trips ADD COLUMN passengers integer DEFAULT 1;
  END IF;
END $$;