/*
  # Temporarily Disable Auth Triggers

  Disable auth triggers to allow manual user creation for testing
  
  1. Changes
    - Drop triggers temporarily
    - We'll recreate them after import test succeeds
*/

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_revoa_admin ON auth.users;
