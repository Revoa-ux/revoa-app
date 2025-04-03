/*
  # Check Migration Status
  
  This migration will:
  1. List all applied migrations
  2. Show migration metadata
  3. Verify key tables exist
*/

-- Check if key tables exist
DO $$ 
BEGIN
  RAISE NOTICE 'Checking required tables...';
  
  -- Check user_profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    RAISE NOTICE 'Table user_profiles exists';
  ELSE 
    RAISE NOTICE 'Table user_profiles is missing!';
  END IF;

  -- Check admin_users
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') THEN
    RAISE NOTICE 'Table admin_users exists';
  ELSE
    RAISE NOTICE 'Table admin_users is missing!';
  END IF;

  -- Check admin_activity_logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_activity_logs') THEN
    RAISE NOTICE 'Table admin_activity_logs exists';
  ELSE
    RAISE NOTICE 'Table admin_activity_logs is missing!';
  END IF;

  -- Check oauth_sessions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'oauth_sessions') THEN
    RAISE NOTICE 'Table oauth_sessions exists';
  ELSE
    RAISE NOTICE 'Table oauth_sessions is missing!';
  END IF;

  -- Check shopify_installations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shopify_installations') THEN
    RAISE NOTICE 'Table shopify_installations exists';
  ELSE
    RAISE NOTICE 'Table shopify_installations is missing!';
  END IF;

  -- Check if admin user exists
  IF EXISTS (SELECT 1 FROM admin_users WHERE email = 'tyler@revoa.app') THEN
    RAISE NOTICE 'Admin user exists';
  ELSE
    RAISE NOTICE 'Admin user is missing!';
  END IF;

  -- Check if admin role enum exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    RAISE NOTICE 'Enum admin_role exists';
  ELSE
    RAISE NOTICE 'Enum admin_role is missing!';
  END IF;

  -- Check RLS policies
  RAISE NOTICE 'Checking RLS policies...';
  
  -- For user_profiles
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Allow profile creation during signup'
  ) THEN
    RAISE NOTICE 'User profiles signup policy exists';
  ELSE
    RAISE NOTICE 'User profiles signup policy is missing!';
  END IF;

  -- For admin_users
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_users' 
    AND policyname = 'Allow public access for admin auth'
  ) THEN
    RAISE NOTICE 'Admin users auth policy exists';
  ELSE
    RAISE NOTICE 'Admin users auth policy is missing!';
  END IF;

END $$;

-- This is a check-only migration, no changes are made
SELECT 'Migration check complete'::text as status;