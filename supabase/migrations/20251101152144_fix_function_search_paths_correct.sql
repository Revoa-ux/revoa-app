/*
  # Fix Function Search Paths - Correct

  1. Security Enhancement
    - Set immutable search_path for all functions to prevent search_path attacks
    - Makes functions security definer safe

  2. Functions Updated
    - All trigger functions and utility functions
    - Sets search_path to empty string

  3. Security
    - Prevents malicious users from changing search_path
    - Ensures functions use fully qualified table names or pg_catalog references
*/

-- Set search_path for all functions with correct signatures
ALTER FUNCTION public.notify_super_admins_of_new_product() SET search_path = '';
ALTER FUNCTION public.log_message_status_change() SET search_path = '';
ALTER FUNCTION public.log_product_approval_change() SET search_path = '';
ALTER FUNCTION public.update_suppliers_updated_at() SET search_path = '';
ALTER FUNCTION public.update_marketplace_transactions_updated_at() SET search_path = '';
ALTER FUNCTION public.update_canva_tokens_updated_at() SET search_path = '';
ALTER FUNCTION public.auto_assign_quote_to_admin() SET search_path = '';
ALTER FUNCTION public.update_product_quotes_updated_at() SET search_path = '';
ALTER FUNCTION public.create_admin_user(admin_email text, admin_role admin_role) SET search_path = '';
ALTER FUNCTION public.update_updated_at() SET search_path = '';
ALTER FUNCTION public.handle_revoa_admin() SET search_path = '';
ALTER FUNCTION public.log_installation_status_change() SET search_path = '';
ALTER FUNCTION public.increment_install_count(store_url text) SET search_path = '';
ALTER FUNCTION public.log_admin_activity() SET search_path = '';
ALTER FUNCTION public.cleanup_expired_oauth_sessions() SET search_path = '';
ALTER FUNCTION public.trigger_cleanup_expired_oauth_sessions() SET search_path = '';
ALTER FUNCTION public.log_app_installation_change() SET search_path = '';
ALTER FUNCTION public.log_installation_change() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';