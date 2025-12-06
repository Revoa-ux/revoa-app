/*
  # Fix tyler.jtw@gmail.com user_profile ID mismatch

  1. Problem
    - tyler.jtw@gmail.com has ID mismatch between auth.users and user_profiles
    - This causes their admin chats to show "User" instead of the actual user info

  2. Solution
    - Delete incorrect user_profiles entry
    - Create new entry with correct ID from auth.users
    - Make them an admin so they can manage conversations
*/

DO $$
DECLARE
  tyler_jtw_wrong_id UUID := 'ec116f01-65ce-4da4-9180-cfdacd73ca5f';
  tyler_jtw_correct_id UUID := 'f3ce7944-e4ec-4701-b04b-50b2c6708fe4';
BEGIN
  -- Delete the incorrect entry
  DELETE FROM user_profiles WHERE id = tyler_jtw_wrong_id;
  
  -- Create correct entry
  INSERT INTO user_profiles (id, user_id, email, name, is_admin, is_super_admin)
  VALUES (
    tyler_jtw_correct_id,
    tyler_jtw_correct_id,
    'tyler.jtw@gmail.com',
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
