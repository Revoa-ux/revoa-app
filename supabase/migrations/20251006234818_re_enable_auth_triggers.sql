/*
  # Re-enable Auth Triggers

  Re-create the auth triggers now that testing is complete
  
  1. Changes
    - Re-create on_auth_user_created trigger
    - Re-create on_auth_user_revoa_admin trigger
*/

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_revoa_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_revoa_admin();
