/*
  # Optimize RLS Policies - Auth Functions Part 3

  This migration continues optimizing RLS policies.

  ## Tables Updated
  - google_ads_ad_schedules
  - google_ads_locations
  - google_ads_location_metrics
  - google_ads_device_metrics
  - google_ads_demographic_metrics
  - google_ads_hourly_metrics
  - google_ads_bid_adjustment_history
*/

-- Drop and recreate google_ads_ad_schedules policies
DROP POLICY IF EXISTS "Users can delete own schedules" ON public.google_ads_ad_schedules;
CREATE POLICY "Users can delete own schedules"
  ON public.google_ads_ad_schedules FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own schedules" ON public.google_ads_ad_schedules;
CREATE POLICY "Users can insert own schedules"
  ON public.google_ads_ad_schedules FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own schedules" ON public.google_ads_ad_schedules;
CREATE POLICY "Users can update own schedules"
  ON public.google_ads_ad_schedules FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own schedules" ON public.google_ads_ad_schedules;
CREATE POLICY "Users can view own schedules"
  ON public.google_ads_ad_schedules FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate google_ads_locations policies
DROP POLICY IF EXISTS "Users can delete own locations" ON public.google_ads_locations;
CREATE POLICY "Users can delete own locations"
  ON public.google_ads_locations FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own locations" ON public.google_ads_locations;
CREATE POLICY "Users can insert own locations"
  ON public.google_ads_locations FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own locations" ON public.google_ads_locations;
CREATE POLICY "Users can update own locations"
  ON public.google_ads_locations FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own locations" ON public.google_ads_locations;
CREATE POLICY "Users can view own locations"
  ON public.google_ads_locations FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate google_ads_location_metrics policies
DROP POLICY IF EXISTS "Users can insert own location metrics" ON public.google_ads_location_metrics;
CREATE POLICY "Users can insert own location metrics"
  ON public.google_ads_location_metrics FOR INSERT TO authenticated
  WITH CHECK (EXISTS ( SELECT 1
     FROM google_ads_locations l
    WHERE ((l.id = google_ads_location_metrics.location_id) AND (l.user_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Users can view own location metrics" ON public.google_ads_location_metrics;
CREATE POLICY "Users can view own location metrics"
  ON public.google_ads_location_metrics FOR SELECT TO authenticated
  USING (EXISTS ( SELECT 1
     FROM google_ads_locations l
    WHERE ((l.id = google_ads_location_metrics.location_id) AND (l.user_id = (select auth.uid())))));

-- Drop and recreate google_ads_device_metrics policies
DROP POLICY IF EXISTS "Users can insert own device metrics" ON public.google_ads_device_metrics;
CREATE POLICY "Users can insert own device metrics"
  ON public.google_ads_device_metrics FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own device metrics" ON public.google_ads_device_metrics;
CREATE POLICY "Users can view own device metrics"
  ON public.google_ads_device_metrics FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate google_ads_demographic_metrics policies
DROP POLICY IF EXISTS "Users can insert own demographic metrics" ON public.google_ads_demographic_metrics;
CREATE POLICY "Users can insert own demographic metrics"
  ON public.google_ads_demographic_metrics FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own demographic metrics" ON public.google_ads_demographic_metrics;
CREATE POLICY "Users can view own demographic metrics"
  ON public.google_ads_demographic_metrics FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate google_ads_hourly_metrics policies
DROP POLICY IF EXISTS "Users can insert own hourly metrics" ON public.google_ads_hourly_metrics;
CREATE POLICY "Users can insert own hourly metrics"
  ON public.google_ads_hourly_metrics FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own hourly metrics" ON public.google_ads_hourly_metrics;
CREATE POLICY "Users can view own hourly metrics"
  ON public.google_ads_hourly_metrics FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate google_ads_bid_adjustment_history policies
DROP POLICY IF EXISTS "Users can insert own bid history" ON public.google_ads_bid_adjustment_history;
CREATE POLICY "Users can insert own bid history"
  ON public.google_ads_bid_adjustment_history FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own bid history" ON public.google_ads_bid_adjustment_history;
CREATE POLICY "Users can update own bid history"
  ON public.google_ads_bid_adjustment_history FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own bid history" ON public.google_ads_bid_adjustment_history;
CREATE POLICY "Users can view own bid history"
  ON public.google_ads_bid_adjustment_history FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
