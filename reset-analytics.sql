-- Run this SQL in your Supabase SQL Editor to reset your analytics preferences
-- Replace 'YOUR_USER_ID_HERE' with your actual user_id from the user_profiles table

-- First, let's see what user IDs exist
SELECT id, email, display_name FROM auth.users LIMIT 10;

-- To reset for a specific user, run:
-- SELECT reset_user_analytics_to_executive('YOUR_USER_ID_HERE');

-- Or to reset for ALL users:
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM user_profiles
  LOOP
    PERFORM reset_user_analytics_to_executive(user_record.id);
    RAISE NOTICE 'Reset analytics for user: %', user_record.id;
  END LOOP;
END $$;

-- Verify the reset worked:
SELECT 
  up.display_name,
  uap.active_template,
  jsonb_array_length(uap.visible_cards) as num_visible_cards,
  uap.visible_cards
FROM user_analytics_preferences uap
JOIN user_profiles up ON up.id = uap.user_id
ORDER BY uap.updated_at DESC;
