/*
  # Add verification fields to partner applications table
  
  1. New Columns
    - Add `verification_id` to link to email_verifications
    - Add `invite_link_id` to track generated invite links
  
  2. Indexes
    - Add indexes for efficient lookup by verification_id and invite_link_id
  
  This migration enhances the partner application process with OTP verification
  and automated partner invite links.
*/

-- Add verification fields to track the verification process
ALTER TABLE IF EXISTS public.partner_applications
ADD COLUMN IF NOT EXISTS verification_id UUID REFERENCES public.email_verifications(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invite_link_id UUID REFERENCES public.invite_links(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_partner_applications_verification_id ON public.partner_applications(verification_id);
CREATE INDEX IF NOT EXISTS idx_partner_applications_invite_link_id ON public.partner_applications(invite_link_id);

-- Add descriptive comments for documentation
COMMENT ON COLUMN public.partner_applications.verification_id IS 'Reference to the email verification record used for OTP verification';
COMMENT ON COLUMN public.partner_applications.invite_link_id IS 'Reference to the invite link created after successful verification';