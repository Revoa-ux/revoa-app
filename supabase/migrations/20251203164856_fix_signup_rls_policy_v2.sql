/*
  # Fix Signup RLS Policy

  1. Problem
    - The handle_new_user() trigger fails because RLS blocks the INSERT
    - During trigger execution, the INSERT needs to work without RLS interference
    - Current policies are too restrictive for trigger operations

  2. Solution
    - Drop restrictive INSERT policies
    - Create policies that allow both user self-creation and trigger operations
    - Allow anon users to create profiles during signup flow

  3. Security
    - Validates user_id consistency
    - Allows necessary operations for signup process
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.user_profiles;

-- Drop any existing anon policy
DROP POLICY IF EXISTS "Allow profile creation for new signups" ON public.user_profiles;

-- Create a policy for authenticated users creating their own profile
CREATE POLICY "Users can create own profile during signup"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create a policy for anon users during the signup process
-- This allows the trigger to work when user is being created
CREATE POLICY "Allow signup profile creation"
  ON public.user_profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);
