/*
  # Optimize RLS Policies - Auth Functions Part 4

  This migration continues optimizing RLS policies.

  ## Tables Updated
  - shopify_stores
  - monthly_order_counts
  - pending_app_store_installs
  - subscription_history
*/

-- Drop and recreate shopify_stores policies
DROP POLICY IF EXISTS "Users can delete their stores" ON public.shopify_stores;
CREATE POLICY "Users can delete their stores"
  ON public.shopify_stores FOR DELETE TO authenticated
  USING (EXISTS ( SELECT 1
     FROM shopify_installations
    WHERE ((shopify_installations.store_url = shopify_stores.store_url) AND (shopify_installations.user_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Users can insert their stores" ON public.shopify_stores;
CREATE POLICY "Users can insert their stores"
  ON public.shopify_stores FOR INSERT TO authenticated
  WITH CHECK (EXISTS ( SELECT 1
     FROM shopify_installations
    WHERE ((shopify_installations.store_url = shopify_stores.store_url) AND (shopify_installations.user_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Users can update their stores" ON public.shopify_stores;
CREATE POLICY "Users can update their stores"
  ON public.shopify_stores FOR UPDATE TO authenticated
  USING (EXISTS ( SELECT 1
     FROM shopify_installations
    WHERE ((shopify_installations.store_url = shopify_stores.store_url) AND (shopify_installations.user_id = (select auth.uid())))))
  WITH CHECK (EXISTS ( SELECT 1
     FROM shopify_installations
    WHERE ((shopify_installations.store_url = shopify_stores.store_url) AND (shopify_installations.user_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Users can view their stores" ON public.shopify_stores;
CREATE POLICY "Users can view their stores"
  ON public.shopify_stores FOR SELECT TO authenticated
  USING (EXISTS ( SELECT 1
     FROM shopify_installations
    WHERE ((shopify_installations.store_url = shopify_stores.store_url) AND (shopify_installations.user_id = (select auth.uid())))));

-- Drop and recreate monthly_order_counts policies
DROP POLICY IF EXISTS "Super admins can view all order counts" ON public.monthly_order_counts;
CREATE POLICY "Super admins can view all order counts"
  ON public.monthly_order_counts FOR SELECT TO authenticated
  USING (EXISTS ( SELECT 1
     FROM user_profiles
    WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true))));

DROP POLICY IF EXISTS "Users can view own order counts" ON public.monthly_order_counts;
CREATE POLICY "Users can view own order counts"
  ON public.monthly_order_counts FOR SELECT TO authenticated
  USING (store_id IN ( SELECT shopify_stores.id
     FROM shopify_stores
    WHERE (shopify_stores.id IN ( SELECT monthly_order_counts.store_id
             FROM user_profiles
            WHERE (user_profiles.id = (select auth.uid()))))));

-- Drop and recreate pending_app_store_installs policies
DROP POLICY IF EXISTS "Users can create own pending installs" ON public.pending_app_store_installs;
CREATE POLICY "Users can create own pending installs"
  ON public.pending_app_store_installs FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own pending installs" ON public.pending_app_store_installs;
CREATE POLICY "Users can update own pending installs"
  ON public.pending_app_store_installs FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own pending installs" ON public.pending_app_store_installs;
CREATE POLICY "Users can view own pending installs"
  ON public.pending_app_store_installs FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate subscription_history policies
DROP POLICY IF EXISTS "Super admins can view all subscription history" ON public.subscription_history;
CREATE POLICY "Super admins can view all subscription history"
  ON public.subscription_history FOR SELECT TO authenticated
  USING (EXISTS ( SELECT 1
     FROM user_profiles
    WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_super_admin = true))));

DROP POLICY IF EXISTS "Users can view own subscription history" ON public.subscription_history;
CREATE POLICY "Users can view own subscription history"
  ON public.subscription_history FOR SELECT TO authenticated
  USING (store_id IN ( SELECT shopify_stores.id
     FROM shopify_stores
    WHERE (shopify_stores.id IN ( SELECT subscription_history.store_id
             FROM user_profiles
            WHERE (user_profiles.id = (select auth.uid()))))));
