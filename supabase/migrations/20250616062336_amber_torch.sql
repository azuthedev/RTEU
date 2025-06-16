/*
  # Fix RLS Infinite Recursion Issue

  1. Problem
    - Current RLS policies on users table cause infinite recursion
    - Policies are querying users table from within users table policies
    - This breaks all user data fetching

  2. Solution
    - Create helper functions that don't cause recursion
    - Update policies to use auth.uid() directly instead of subqueries
    - Ensure admin checks use proper functions

  3. Security
    - Maintain same security model but fix recursion
    - Users can only see their own data or admin can see all
*/

-- First, let's create a helper function to check if current user is admin
-- This function will be created outside the RLS context to avoid recursion
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'user_role' = 'admin'
  );
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Combined users view policy" ON public.users;
DROP POLICY IF EXISTS "Combined users insert policy" ON public.users;
DROP POLICY IF EXISTS "Combined users update policy" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Create new, non-recursive policies for users table

-- View policy: Users can see their own data, admins can see all
CREATE POLICY "Users can view own data or admin can view all"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR is_current_user_admin()
  );

-- Insert policy: Only allow during signup or by admin
CREATE POLICY "Allow user creation during signup or by admin"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id OR is_current_user_admin()
  );

-- Update policy: Users can update their own data, admins can update any
CREATE POLICY "Users can update own data or admin can update any"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR is_current_user_admin()
  )
  WITH CHECK (
    auth.uid() = id OR is_current_user_admin()
  );

-- Delete policy: Only admins can delete users
CREATE POLICY "Only admins can delete users"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO service_role;

-- Update any other policies that might have similar issues
-- Check if is_admin function exists and update it to avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT is_current_user_admin();
$$;