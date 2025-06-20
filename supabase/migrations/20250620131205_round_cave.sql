/*
  # Update Partner Application Schema
  
  1. New Fields
     - Add `vat_number` TEXT field to store VAT/tax identification
  
  2. Changes
     - Make company_name, phone, and message required fields (NOT NULL)
     - Add default values for existing records
     - Add comments to document field requirements
  
  This migration enhances the partner application with required business information
  and standardizes the application data quality.
*/

-- First set default values for existing NULL records to prevent errors
UPDATE partner_applications 
SET company_name = '' 
WHERE company_name IS NULL;

UPDATE partner_applications 
SET phone = '' 
WHERE phone IS NULL;

UPDATE partner_applications 
SET message = '' 
WHERE message IS NULL;

-- Add VAT number column
ALTER TABLE partner_applications
ADD COLUMN IF NOT EXISTS vat_number TEXT;

-- Make fields required after setting defaults
ALTER TABLE partner_applications 
ALTER COLUMN company_name SET NOT NULL;

ALTER TABLE partner_applications 
ALTER COLUMN phone SET NOT NULL;

ALTER TABLE partner_applications 
ALTER COLUMN message SET NOT NULL;

-- Add or update column comments
COMMENT ON COLUMN partner_applications.vat_number IS 'VAT/tax identification number of the applicant (required)';
COMMENT ON COLUMN partner_applications.company_name IS 'Company name of the applicant (required)';
COMMENT ON COLUMN partner_applications.phone IS 'Phone number of the applicant (required)';
COMMENT ON COLUMN partner_applications.message IS 'Additional information about the applicant and their business (required)';