/*
  # Fix log_installation_change function to use fully qualified table names

  1. Changes
    - Update log_installation_change() function to use `public.shopify_sync_logs` instead of `shopify_sync_logs`
    - This fixes the error "relation shopify_sync_logs does not exist" that occurs when the function's search_path is empty
  
  2. Security
    - The function already has search_path set to empty string for security
    - Using fully qualified names is the correct approach
*/

CREATE OR REPLACE FUNCTION public.log_installation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  previous_status text;
  new_status text;
BEGIN
  -- Handle status changes safely
  IF TG_OP = 'UPDATE' THEN
    previous_status = OLD.status::text;
    new_status = NEW.status::text;
  ELSE
    previous_status = null;
    new_status = NEW.status::text;
  END IF;

  INSERT INTO public.shopify_sync_logs (
    store_id,
    event_type,
    status,
    details
  ) VALUES (
    NEW.id,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'installation_created'
      WHEN TG_OP = 'UPDATE' AND previous_status IS DISTINCT FROM new_status THEN 'status_changed'
      ELSE 'installation_updated'
    END,
    'success',
    jsonb_build_object(
      'previous_status', previous_status,
      'new_status', new_status,
      'changed_at', CURRENT_TIMESTAMP
    )
  );
  RETURN NEW;
END;
$$;