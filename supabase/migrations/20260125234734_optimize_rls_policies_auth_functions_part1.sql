/*
  # Optimize RLS Policies - Auth Functions Part 1

  This migration optimizes RLS policies by replacing `auth.uid()` with `(select auth.uid())`
  to avoid re-evaluating auth functions for each row, improving query performance.

  ## Tables Updated
  - messages
  - google_ads_bid_adjustments
  - google_ads_keywords
  - google_ads_keyword_metrics
*/

-- Drop and recreate messages policy with optimized auth calls
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (
    ((sender = 'user'::text) AND (EXISTS ( SELECT 1
       FROM chats
      WHERE ((chats.id = messages.chat_id) AND (chats.user_id = (select auth.uid())))))) 
    OR ((sender = 'team'::text) AND (EXISTS ( SELECT 1
       FROM user_profiles
      WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true)))))
  )
  WITH CHECK (
    (deleted_at IS NOT NULL) AND (
      ((sender = 'user'::text) AND (EXISTS ( SELECT 1
         FROM chats
        WHERE ((chats.id = messages.chat_id) AND (chats.user_id = (select auth.uid())))))) 
      OR ((sender = 'team'::text) AND (EXISTS ( SELECT 1
         FROM user_profiles
        WHERE ((user_profiles.id = (select auth.uid())) AND (user_profiles.is_admin = true))))))
  );

-- Drop and recreate google_ads_bid_adjustments policies
DROP POLICY IF EXISTS "Users can delete own bid adjustments" ON public.google_ads_bid_adjustments;
CREATE POLICY "Users can delete own bid adjustments"
  ON public.google_ads_bid_adjustments FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own bid adjustments" ON public.google_ads_bid_adjustments;
CREATE POLICY "Users can insert own bid adjustments"
  ON public.google_ads_bid_adjustments FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own bid adjustments" ON public.google_ads_bid_adjustments;
CREATE POLICY "Users can update own bid adjustments"
  ON public.google_ads_bid_adjustments FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own bid adjustments" ON public.google_ads_bid_adjustments;
CREATE POLICY "Users can view own bid adjustments"
  ON public.google_ads_bid_adjustments FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate google_ads_keywords policies
DROP POLICY IF EXISTS "Users can delete own keywords" ON public.google_ads_keywords;
CREATE POLICY "Users can delete own keywords"
  ON public.google_ads_keywords FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own keywords" ON public.google_ads_keywords;
CREATE POLICY "Users can insert own keywords"
  ON public.google_ads_keywords FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own keywords" ON public.google_ads_keywords;
CREATE POLICY "Users can update own keywords"
  ON public.google_ads_keywords FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own keywords" ON public.google_ads_keywords;
CREATE POLICY "Users can view own keywords"
  ON public.google_ads_keywords FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate google_ads_keyword_metrics policies
DROP POLICY IF EXISTS "Users can insert own keyword metrics" ON public.google_ads_keyword_metrics;
CREATE POLICY "Users can insert own keyword metrics"
  ON public.google_ads_keyword_metrics FOR INSERT TO authenticated
  WITH CHECK (EXISTS ( SELECT 1
     FROM google_ads_keywords k
    WHERE ((k.id = google_ads_keyword_metrics.keyword_id) AND (k.user_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Users can view own keyword metrics" ON public.google_ads_keyword_metrics;
CREATE POLICY "Users can view own keyword metrics"
  ON public.google_ads_keyword_metrics FOR SELECT TO authenticated
  USING (EXISTS ( SELECT 1
     FROM google_ads_keywords k
    WHERE ((k.id = google_ads_keyword_metrics.keyword_id) AND (k.user_id = (select auth.uid())))));
