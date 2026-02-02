/*
  # Optimize RLS Policies - Part 2 (Ad Tables & User Profiles) - Correct

  1. Performance Optimization
    - Replace direct `auth.uid()` calls with `(select auth.uid())`
    - Optimizes ad_campaigns, ad_sets, ads, ad_metrics, user_profiles

  2. Changes
    - Drop existing policies
    - Recreate with optimized auth function calls
    - Uses correct column names: ad_account_id, ad_campaign_id, ad_set_id
*/

-- ad_campaigns policies (already optimized in part 1, but recreating for consistency)
DROP POLICY IF EXISTS "Users can view own campaigns" ON public.ad_campaigns;
CREATE POLICY "Users can view own campaigns"
  ON public.ad_campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_accounts
      WHERE ad_accounts.id = ad_campaigns.ad_account_id
      AND ad_accounts.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own campaigns" ON public.ad_campaigns;
CREATE POLICY "Users can insert own campaigns"
  ON public.ad_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ad_accounts
      WHERE ad_accounts.id = ad_account_id
      AND ad_accounts.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own campaigns" ON public.ad_campaigns;
CREATE POLICY "Users can update own campaigns"
  ON public.ad_campaigns FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_accounts
      WHERE ad_accounts.id = ad_campaigns.ad_account_id
      AND ad_accounts.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.ad_campaigns;
CREATE POLICY "Users can delete own campaigns"
  ON public.ad_campaigns FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_accounts
      WHERE ad_accounts.id = ad_campaigns.ad_account_id
      AND ad_accounts.user_id = (select auth.uid())
    )
  );

-- ad_sets policies
DROP POLICY IF EXISTS "Users can view own ad sets" ON public.ad_sets;
CREATE POLICY "Users can view own ad sets"
  ON public.ad_sets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns ac
      JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
      WHERE ac.id = ad_sets.ad_campaign_id
      AND aa.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own ad sets" ON public.ad_sets;
CREATE POLICY "Users can insert own ad sets"
  ON public.ad_sets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns ac
      JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
      WHERE ac.id = ad_campaign_id
      AND aa.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own ad sets" ON public.ad_sets;
CREATE POLICY "Users can update own ad sets"
  ON public.ad_sets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns ac
      JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
      WHERE ac.id = ad_sets.ad_campaign_id
      AND aa.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own ad sets" ON public.ad_sets;
CREATE POLICY "Users can delete own ad sets"
  ON public.ad_sets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns ac
      JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
      WHERE ac.id = ad_sets.ad_campaign_id
      AND aa.user_id = (select auth.uid())
    )
  );

-- ads policies
DROP POLICY IF EXISTS "Users can view own ads" ON public.ads;
CREATE POLICY "Users can view own ads"
  ON public.ads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_sets ast
      JOIN public.ad_campaigns ac ON ac.id = ast.ad_campaign_id
      JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
      WHERE ast.id = ads.ad_set_id
      AND aa.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own ads" ON public.ads;
CREATE POLICY "Users can insert own ads"
  ON public.ads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ad_sets ast
      JOIN public.ad_campaigns ac ON ac.id = ast.ad_campaign_id
      JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
      WHERE ast.id = ad_set_id
      AND aa.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own ads" ON public.ads;
CREATE POLICY "Users can update own ads"
  ON public.ads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_sets ast
      JOIN public.ad_campaigns ac ON ac.id = ast.ad_campaign_id
      JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
      WHERE ast.id = ads.ad_set_id
      AND aa.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own ads" ON public.ads;
CREATE POLICY "Users can delete own ads"
  ON public.ads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_sets ast
      JOIN public.ad_campaigns ac ON ac.id = ast.ad_campaign_id
      JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
      WHERE ast.id = ads.ad_set_id
      AND aa.user_id = (select auth.uid())
    )
  );

-- ad_metrics policies (entity-based access control)
DROP POLICY IF EXISTS "Users can view own metrics" ON public.ad_metrics;
CREATE POLICY "Users can view own metrics"
  ON public.ad_metrics FOR SELECT
  TO authenticated
  USING (
    CASE entity_type
      WHEN 'campaign' THEN EXISTS (
        SELECT 1 FROM public.ad_campaigns ac
        JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
        WHERE ac.id = entity_id AND aa.user_id = (select auth.uid())
      )
      WHEN 'adset' THEN EXISTS (
        SELECT 1 FROM public.ad_sets ast
        JOIN public.ad_campaigns ac ON ac.id = ast.ad_campaign_id
        JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
        WHERE ast.id = entity_id AND aa.user_id = (select auth.uid())
      )
      WHEN 'ad' THEN EXISTS (
        SELECT 1 FROM public.ads a
        JOIN public.ad_sets ast ON ast.id = a.ad_set_id
        JOIN public.ad_campaigns ac ON ac.id = ast.ad_campaign_id
        JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
        WHERE a.id = entity_id AND aa.user_id = (select auth.uid())
      )
      ELSE false
    END
  );

DROP POLICY IF EXISTS "Users can insert own metrics" ON public.ad_metrics;
CREATE POLICY "Users can insert own metrics"
  ON public.ad_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    CASE entity_type
      WHEN 'campaign' THEN EXISTS (
        SELECT 1 FROM public.ad_campaigns ac
        JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
        WHERE ac.id = entity_id AND aa.user_id = (select auth.uid())
      )
      WHEN 'adset' THEN EXISTS (
        SELECT 1 FROM public.ad_sets ast
        JOIN public.ad_campaigns ac ON ac.id = ast.ad_campaign_id
        JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
        WHERE ast.id = entity_id AND aa.user_id = (select auth.uid())
      )
      WHEN 'ad' THEN EXISTS (
        SELECT 1 FROM public.ads a
        JOIN public.ad_sets ast ON ast.id = a.ad_set_id
        JOIN public.ad_campaigns ac ON ac.id = ast.ad_campaign_id
        JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
        WHERE a.id = entity_id AND aa.user_id = (select auth.uid())
      )
      ELSE false
    END
  );

DROP POLICY IF EXISTS "Users can update own metrics" ON public.ad_metrics;
CREATE POLICY "Users can update own metrics"
  ON public.ad_metrics FOR UPDATE
  TO authenticated
  USING (
    CASE entity_type
      WHEN 'campaign' THEN EXISTS (
        SELECT 1 FROM public.ad_campaigns ac
        JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
        WHERE ac.id = entity_id AND aa.user_id = (select auth.uid())
      )
      WHEN 'adset' THEN EXISTS (
        SELECT 1 FROM public.ad_sets ast
        JOIN public.ad_campaigns ac ON ac.id = ast.ad_campaign_id
        JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
        WHERE ast.id = entity_id AND aa.user_id = (select auth.uid())
      )
      WHEN 'ad' THEN EXISTS (
        SELECT 1 FROM public.ads a
        JOIN public.ad_sets ast ON ast.id = a.ad_set_id
        JOIN public.ad_campaigns ac ON ac.id = ast.ad_campaign_id
        JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
        WHERE a.id = entity_id AND aa.user_id = (select auth.uid())
      )
      ELSE false
    END
  );

-- user_profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));