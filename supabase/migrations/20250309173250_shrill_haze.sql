/*
  # Fix User Profiles RLS Policies

  1. Security
    - Drop existing policies to avoid conflicts
    - Re-create policies with correct permissions
    - Enable RLS on user_profiles table

  2. Changes
    - Drop all existing policies
    - Create new policies for:
      - Profile creation during signup
      - Authenticated user access
      - Service role access
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role has full access" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access"
ON user_profiles
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can read own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow profile creation during signup
CREATE POLICY "Allow profile creation during signup"
ON user_profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);