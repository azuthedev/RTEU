/*
  # Add vehicle_type to partner_applications
  
  1. New Column
    - Add `vehicle_type` TEXT column to partner_applications table (optional field)
  
  2. Purpose
    - Allows partners to specify their vehicle type during application
    - Field is optional but should be stored if provided
*/

-- Add vehicle_type column as nullable (optional)
ALTER TABLE partner_applications
ADD COLUMN IF NOT EXISTS vehicle_type TEXT;

-- Add descriptive comment
COMMENT ON COLUMN partner_applications.vehicle_type IS 'Optional field for applicant to specify their vehicle type';