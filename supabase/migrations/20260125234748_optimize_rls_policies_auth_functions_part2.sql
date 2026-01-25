/*
  # Optimize RLS Policies - Auth Functions Part 2

  This migration continues optimizing RLS policies.

  ## Tables Updated
  - google_ads_audiences
  - google_ads_audience_metrics
  - google_ads_placements
  - google_ads_placement_metrics
*/

-- Drop and recreate google_ads_audiences policies
DROP POLICY IF EXISTS "Users can delete own audiences" ON public.google_ads_audiences;
CREATE POLICY "Users can delete own audiences"
  ON public.google_ads_audiences FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own audiences" ON public.google_ads_audiences;
CREATE POLICY "Users can insert own audiences"
  ON public.google_ads_audiences FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own audiences" ON public.google_ads_audiences;
CREATE POLICY "Users can update own audiences"
  ON public.google_ads_audiences FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own audiences" ON public.google_ads_audiences;
CREATE POLICY "Users can view own audiences"
  ON public.google_ads_audiences FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate google_ads_audience_metrics policies
DROP POLICY IF EXISTS "Users can insert own audience metrics" ON public.google_ads_audience_metrics;
CREATE POLICY "Users can insert own audience metrics"
  ON public.google_ads_audience_metrics FOR INSERT TO authenticated
  WITH CHECK (EXISTS ( SELECT 1
     FROM google_ads_audiences a
    WHERE ((a.id = google_ads_audience_metrics.audience_id) AND (a.user_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Users can view own audience metrics" ON public.google_ads_audience_metrics;
CREATE POLICY "Users can view own audience metrics"
  ON public.google_ads_audience_metrics FOR SELECT TO authenticated
  USING (EXISTS ( SELECT 1
     FROM google_ads_audiences a
    WHERE ((a.id = google_ads_audience_metrics.audience_id) AND (a.user_id = (select auth.uid())))));

-- Drop and recreate google_ads_placements policies
DROP POLICY IF EXISTS "Users can delete own placements" ON public.google_ads_placements;
CREATE POLICY "Users can delete own placements"
  ON public.google_ads_placements FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own placements" ON public.google_ads_placements;
CREATE POLICY "Users can insert own placements"
  ON public.google_ads_placements FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own placements" ON public.google_ads_placements;
CREATE POLICY "Users can update own placements"
  ON public.google_ads_placements FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own placements" ON public.google_ads_placements;
CREATE POLICY "Users can view own placements"
  ON public.google_ads_placements FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate google_ads_placement_metrics policies
DROP POLICY IF EXISTS "Users can insert own placement metrics" ON public.google_ads_placement_metrics;
CREATE POLICY "Users can insert own placement metrics"
  ON public.google_ads_placement_metrics FOR INSERT TO authenticated
  WITH CHECK (EXISTS ( SELECT 1
     FROM google_ads_placements p
    WHERE ((p.id = google_ads_placement_metrics.placement_id) AND (p.user_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Users can view own placement metrics" ON public.google_ads_placement_metrics;
CREATE POLICY "Users can view own placement metrics"
  ON public.google_ads_placement_metrics FOR SELECT TO authenticated
  USING (EXISTS ( SELECT 1
     FROM google_ads_placements p
    WHERE ((p.id = google_ads_placement_metrics.placement_id) AND (p.user_id = (select auth.uid())))));
