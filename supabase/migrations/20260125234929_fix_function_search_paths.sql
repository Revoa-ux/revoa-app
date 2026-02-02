/*
  # Fix Function Search Paths

  This migration fixes functions with mutable search paths by explicitly setting
  the search_path to prevent potential security issues.

  ## Functions Updated
  - update_store_order_count
  - get_recommended_tier
*/

-- Drop and recreate get_recommended_tier with explicit search_path
CREATE OR REPLACE FUNCTION public.get_recommended_tier(order_count integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
BEGIN
  IF order_count <= 100 THEN
    RETURN 'startup';
  ELSIF order_count <= 300 THEN
    RETURN 'momentum';
  ELSIF order_count <= 1000 THEN
    RETURN 'scale';
  ELSE
    RETURN 'enterprise';
  END IF;
END;
$function$;

-- Drop and recreate update_store_order_count with explicit search_path
CREATE OR REPLACE FUNCTION public.update_store_order_count(store_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_count integer;
  period_start timestamptz;
  period_end timestamptz;
BEGIN
  period_start := NOW() - INTERVAL '30 days';
  period_end := NOW();

  -- Calculate current order count
  new_count := calculate_monthly_order_count(store_id_param);

  -- Update shopify_stores table
  UPDATE shopify_stores
  SET 
    monthly_order_count = new_count,
    last_order_count_update = NOW()
  WHERE id = store_id_param;

  -- Insert into monthly_order_counts history
  INSERT INTO monthly_order_counts (store_id, count_date, order_count, calculation_period_start, calculation_period_end)
  VALUES (store_id_param, CURRENT_DATE, new_count, period_start, period_end)
  ON CONFLICT (store_id, count_date) 
  DO UPDATE SET 
    order_count = EXCLUDED.order_count,
    calculation_period_end = EXCLUDED.calculation_period_end;
END;
$function$;
