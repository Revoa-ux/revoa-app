/*
  # Fix User Profiles RLS Policies

  1. Security
    - Enable RLS on user_profiles table
    - Add policy for unauthenticated users to create profiles during signup
    - Add policy for service role full access

  2. Changes
    - Enable RLS on user_profiles table
    - Create policies for profile creation
    - Add service role access policy
*/

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role has full access" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;

-- Allow service role full access
CREATE POLICY "Service role has full access"
ON user_profiles
TO service_role
USING (true)
WITH CHECK (true);

-- Allow unauthenticated users to create profiles during signup
CREATE POLICY "Allow profile creation during signup"
ON user_profiles
FOR INSERT
TO anon
WITH CHECK (true);