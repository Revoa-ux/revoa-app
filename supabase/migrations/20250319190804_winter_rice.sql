/*
  # Fix User Profile Creation and RLS Policies

  1. Changes
    - Drop existing policies
    - Create new policies for signup flow
    - Fix user profile creation trigger
    - Add proper RLS policies

  2. Security
    - Enable RLS
    - Add policies for secure access
    - Maintain audit logging
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role has full access" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies
CREATE POLICY "Service role has full access"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow profile creation during signup"
  ON user_profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm email
  UPDATE auth.users
  SET email_confirmed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
  
  -- Create user profile
  INSERT INTO public.user_profiles (
    user_id,
    email,
    onboarding_completed,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    false,
    jsonb_build_object(
      'signup_source', COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
      'initial_role', COALESCE(NEW.raw_app_meta_data->>'role', 'user')
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add helpful comments
COMMENT ON TABLE user_profiles IS 'Stores user profile information and preferences';
COMMENT ON COLUMN user_profiles.metadata IS 'JSON field for storing additional user data';
COMMENT ON FUNCTION public.handle_new_user IS 'Automatically confirms email and creates profile for new users';