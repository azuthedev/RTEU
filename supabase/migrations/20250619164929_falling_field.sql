/*
  # Update partner_applications table for email verification and invite links

  1. New Columns
    - Add `verification_id` to store OTP verification record reference
    - Add `invite_link_id` to link invite record after successful verification
    
  2. Changes
    - Add foreign key constraints to both new columns
    - Add indexes for better query performance
    
  3. Security
    - Allow anonymous users to submit applications (for guest signups)
    - Keep admin policies for managing all applications
    
  This migration supports the new partner signup flow with email verification
  and automatic invite link generation.
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

-- Modify policy to allow non-authenticated users to submit applications
DROP POLICY IF EXISTS "Users can submit partner applications" ON public.partner_applications;

CREATE POLICY "Users can submit partner applications"
ON public.partner_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);