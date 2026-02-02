/*
  # Fix Signup - Add INSERT Policy for user_profiles

  1. Problem
    - handle_new_user() trigger function cannot insert into user_profiles
    - No INSERT policy exists for user_profiles table
    - Even SECURITY DEFINER functions need proper RLS policies

  2. Solution
    - Add INSERT policy allowing the trigger to create profiles
    - Policy allows insertion during signup process

  3. Security
    - Users can only insert their own profile (user_id must match auth.uid())
    - Maintains data integrity and security
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.user_profiles;

-- Add INSERT policy for user_profiles to allow signup
CREATE POLICY "Allow profile creation during signup"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Also add a service role bypass policy for the trigger function
CREATE POLICY "Service role can insert profiles"
  ON public.user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);
