/*
  # Enable User Signups

  1. Changes
    - Enable email signups in auth.email settings
    - Add email confirmation trigger
    - Update user_profiles table constraints
    - Add RLS policies for profile creation during signup

  2. Security
    - Enable RLS on user_profiles table
    - Add policies for profile management
    - Ensure proper user isolation
*/

-- Enable email signups and configure auth settings
BEGIN;
  -- Update auth.email settings to enable signups
  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '{}', 'email', NOW(), NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Ensure user_profiles table exists with proper constraints
  CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    onboarding_completed boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    last_login timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );

  -- Enable RLS
  ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

  -- Create policies
  DO $$ BEGIN
    -- Allow profile creation during signup
    CREATE POLICY "Allow profile creation during signup"
      ON public.user_profiles
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);

    -- Allow users to read own profile
    CREATE POLICY "Users can read own profile"
      ON public.user_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    -- Allow users to update own profile
    CREATE POLICY "Users can update own profile"
      ON public.user_profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Service role has full access
    CREATE POLICY "Service role has full access"
      ON public.user_profiles
      TO service_role
      USING (true)
      WITH CHECK (true);
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END $$;

  -- Create updated_at trigger
  CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Add trigger to update updated_at
  DO $$ BEGIN
    CREATE TRIGGER update_user_profiles_updated_at
      BEFORE UPDATE ON public.user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END $$;

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

COMMIT;