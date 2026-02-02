/*
  # Fix user_profiles ID mismatch with auth.users (v2)

  1. Problem
    - Some user_profiles entries have IDs that don't match auth.users
    - This causes chats to show "User" because the join fails
    - Assignments can't be created due to foreign key constraints

  2. Solution
    - Delete incorrect user_profiles entries
    - Create new entries with correct IDs from auth.users
    - Set both id and user_id to the auth.users.id
    - Preserve the profile data (name, company, etc.)

  3. Affected Users
    - ammazonrev2@gmail.com (Maddie)
    - tyler@revoa.app (Tyler)
*/

-- Store the profile data before deletion
DO $$
DECLARE
  maddie_wrong_id UUID := '601a6d03-bfda-48d6-b18f-9922bca33616';
  maddie_correct_id UUID := '98d08145-7209-4a5d-86e5-5db9a51e6eda';
  tyler_wrong_id UUID := '2593a27c-77eb-4090-ba49-62f0321dc902';
  tyler_correct_id UUID := 'c45a44fc-1639-4882-bd32-164699c7166b';
BEGIN
  -- Fix Maddie's profile
  -- Delete the incorrect entry
  DELETE FROM user_profiles WHERE id = maddie_wrong_id;
  
  -- Create correct entry if it doesn't exist
  INSERT INTO user_profiles (id, user_id, email, name, first_name, last_name, company, is_admin, is_super_admin)
  VALUES (
    maddie_correct_id,
    maddie_correct_id,
    'ammazonrev2@gmail.com',
    'Maddie',
    'Maddie',
    'Wohlf',
    '',
    false,
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    user_id = EXCLUDED.user_id,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    company = EXCLUDED.company;

  -- Fix Tyler's profile
  -- Delete the incorrect entry
  DELETE FROM user_profiles WHERE id = tyler_wrong_id;
  
  -- Create correct entry if it doesn't exist
  INSERT INTO user_profiles (id, user_id, email, name, is_admin, is_super_admin)
  VALUES (
    tyler_correct_id,
    tyler_correct_id,
    'tyler@revoa.app',
    'Tyler',
    true,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    user_id = EXCLUDED.user_id,
    is_admin = EXCLUDED.is_admin,
    is_super_admin = EXCLUDED.is_super_admin,
    name = COALESCE(user_profiles.name, EXCLUDED.name);
END $$;
