/*
  # Add passengers column to trips table
  
  1. Changes
     - Add `passengers` column to `trips` table for storing the number of passengers
     
  2. Why This Is Important
     - This column is required for booking functionality
     - Ensures proper passenger count tracking for all trips
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