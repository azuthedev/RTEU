/*
  # Create Partner Applications Table
  
  1. New Tables
     - `partner_applications` - Stores partner signup form submissions
       - `id` (uuid, primary key, generated)
       - `name` (text, not null)
       - `email` (text, not null)
       - `phone` (text)
       - `company_name` (text)
       - `message` (text)
       - `status` (enum: pending, approved, rejected)
       - `created_at` (timestamp with time zone)
  
  2. Security
     - Enable Row Level Security (RLS) on the table
     - Add policy for service_role to have full access
     - Add policy for authenticated users to insert their own applications
     - Add policy for admins to view and manage all applications
*/

-- Create the application status enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END$$;

-- Create the partner_applications table
CREATE TABLE IF NOT EXISTS public.partner_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company_name TEXT,
    message TEXT,
    status application_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_partner_applications_email ON public.partner_applications(email);
CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON public.partner_applications(status);
CREATE INDEX IF NOT EXISTS idx_partner_applications_created_at ON public.partner_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_partner_applications_user_id ON public.partner_applications(user_id);

-- Enable Row Level Security
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
-- Admin can do all operations
CREATE POLICY "Admins can manage partner applications"
ON public.partner_applications
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users
        WHERE users.id = auth.uid() AND users.user_role = 'admin'
    )
);

-- Any authenticated user can insert their own application
CREATE POLICY "Users can submit partner applications"
ON public.partner_applications
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
);

-- Add comments for better documentation
COMMENT ON TABLE public.partner_applications IS 'Stores partner signup form submissions';
COMMENT ON COLUMN public.partner_applications.id IS 'Unique identifier for the application';
COMMENT ON COLUMN public.partner_applications.name IS 'Full name of the applicant';
COMMENT ON COLUMN public.partner_applications.email IS 'Email address of the applicant';
COMMENT ON COLUMN public.partner_applications.phone IS 'Phone number of the applicant';
COMMENT ON COLUMN public.partner_applications.company_name IS 'Company name of the applicant, if applicable';
COMMENT ON COLUMN public.partner_applications.message IS 'Additional message or information provided by the applicant';
COMMENT ON COLUMN public.partner_applications.status IS 'Current status of the application';
COMMENT ON COLUMN public.partner_applications.created_at IS 'Timestamp when the application was submitted';
COMMENT ON COLUMN public.partner_applications.user_id IS 'Reference to the user who submitted the application, if authenticated';