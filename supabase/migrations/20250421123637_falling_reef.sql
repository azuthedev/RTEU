/*
  # Add booking_reference column and fix data types
  
  1. Changes
     - Update trips.booking_reference to use text type instead of UUID
     - Ensure booking_reference has proper indexing and constraints
     
  2. Why This Is Important
     - Allows storing custom format booking references (0000a0 style)
     - Ensures proper referencing of bookings across the system
*/

DO $$
BEGIN
  -- Check if booking_reference column exists and update its type if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'trips' 
    AND column_name = 'booking_reference'
  ) THEN
    -- If it's a UUID type, alter it to text
    IF (
      SELECT data_type 
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'trips' 
      AND column_name = 'booking_reference'
    ) = 'uuid' THEN
      -- First drop any constraints or indices on the column
      ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_booking_reference_key;
      
      -- Then alter the column type
      ALTER TABLE trips 
        ALTER COLUMN booking_reference TYPE text 
        USING booking_reference::text;
        
      -- Add unique constraint back
      ALTER TABLE trips ADD CONSTRAINT trips_booking_reference_key UNIQUE (booking_reference);
    END IF;
  ELSE
    -- If the column doesn't exist, add it
    ALTER TABLE trips ADD COLUMN booking_reference text;
    ALTER TABLE trips ADD CONSTRAINT trips_booking_reference_key UNIQUE (booking_reference);
  END IF;
  
  -- Create index on booking_reference if it doesn't exist yet
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'trips' 
    AND indexname = 'trips_booking_reference_idx'
  ) THEN
    CREATE INDEX trips_booking_reference_idx ON trips (booking_reference);
  END IF;
END $$;