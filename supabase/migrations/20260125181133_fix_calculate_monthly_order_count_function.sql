/*
  # Fix calculate_monthly_order_count function
  
  1. Problem
    - Current function assumes shopify_orders.user_id equals store_id
    - Actually, shopify_orders.user_id is the user profile ID
    - Need to join through shopify_installations to find orders by store
  
  2. Fix
    - Update function to join shopify_installations to find user_id for the store
    - Then count orders for that user within the last 30 days
*/

CREATE OR REPLACE FUNCTION public.calculate_monthly_order_count(store_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_count integer;
  store_user_id uuid;
BEGIN
  -- Get the user_id associated with this store via shopify_installations
  SELECT si.user_id INTO store_user_id
  FROM shopify_installations si
  JOIN shopify_stores ss ON ss.store_url = si.store_url
  WHERE ss.id = store_id_param
    AND si.status = 'installed'
    AND si.uninstalled_at IS NULL
  LIMIT 1;

  -- If no installation found, try matching by store_url directly
  IF store_user_id IS NULL THEN
    SELECT si.user_id INTO store_user_id
    FROM shopify_installations si
    WHERE si.store_url = (SELECT store_url FROM shopify_stores WHERE id = store_id_param)
    LIMIT 1;
  END IF;

  -- Count orders for this user in the last 30 days
  SELECT COUNT(*)
  INTO order_count
  FROM shopify_orders
  WHERE user_id = store_user_id
    AND ordered_at >= NOW() - INTERVAL '30 days'
    AND ordered_at <= NOW();

  RETURN COALESCE(order_count, 0);
END;
$$;