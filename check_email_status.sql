-- Check email confirmation status for user
SELECT 
  user_id, 
  email, 
  email_confirmed,
  onboarding_completed,
  created_at,
  updated_at
FROM user_profiles 
WHERE email = 'diner@revoa.app'
ORDER BY created_at DESC;
