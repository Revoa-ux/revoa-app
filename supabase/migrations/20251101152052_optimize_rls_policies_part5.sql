/*
  # Optimize RLS Policies - Part 5 (Product Media, Import Jobs, API Keys, Canva)

  1. Performance Optimization
    - Replace direct `auth.uid()` calls with `(select auth.uid())`
    - Optimizes product_images, product_media, product_creatives, product_import_logs, api_keys, import_jobs, canva_tokens

  2. Changes
    - Drop existing policies
    - Recreate with optimized auth function calls
*/

-- product_images policies
DROP POLICY IF EXISTS "Admins can view all product images" ON public.product_images;
CREATE POLICY "Admins can view all product images"
  ON public.product_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
CREATE POLICY "Admins can manage product images"
  ON public.product_images FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- product_media policies
DROP POLICY IF EXISTS "Admins can view all product media" ON public.product_media;
CREATE POLICY "Admins can view all product media"
  ON public.product_media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage product media" ON public.product_media;
CREATE POLICY "Admins can manage product media"
  ON public.product_media FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- product_creatives policies
DROP POLICY IF EXISTS "Admins can view all product creatives" ON public.product_creatives;
CREATE POLICY "Admins can view all product creatives"
  ON public.product_creatives FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage product creatives" ON public.product_creatives;
CREATE POLICY "Admins can manage product creatives"
  ON public.product_creatives FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- product_import_logs policies
DROP POLICY IF EXISTS "Super admins can view import logs" ON public.product_import_logs;
CREATE POLICY "Super admins can view import logs"
  ON public.product_import_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_super_admin = true
    )
  );

-- api_keys policies
DROP POLICY IF EXISTS "Super admins can view API keys" ON public.api_keys;
CREATE POLICY "Super admins can view API keys"
  ON public.api_keys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can create API keys" ON public.api_keys;
CREATE POLICY "Super admins can create API keys"
  ON public.api_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can update API keys" ON public.api_keys;
CREATE POLICY "Super admins can update API keys"
  ON public.api_keys FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can delete API keys" ON public.api_keys;
CREATE POLICY "Super admins can delete API keys"
  ON public.api_keys FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_super_admin = true
    )
  );

-- import_jobs policies
DROP POLICY IF EXISTS "Admins can view all import jobs" ON public.import_jobs;
CREATE POLICY "Admins can view all import jobs"
  ON public.import_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can create import jobs" ON public.import_jobs;
CREATE POLICY "Admins can create import jobs"
  ON public.import_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can update import jobs" ON public.import_jobs;
CREATE POLICY "Admins can update import jobs"
  ON public.import_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- canva_tokens policies
DROP POLICY IF EXISTS "Super admins can read Canva tokens" ON public.canva_tokens;
CREATE POLICY "Super admins can read Canva tokens"
  ON public.canva_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can insert Canva tokens" ON public.canva_tokens;
CREATE POLICY "Super admins can insert Canva tokens"
  ON public.canva_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can update Canva tokens" ON public.canva_tokens;
CREATE POLICY "Super admins can update Canva tokens"
  ON public.canva_tokens FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can delete Canva tokens" ON public.canva_tokens;
CREATE POLICY "Super admins can delete Canva tokens"
  ON public.canva_tokens FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_super_admin = true
    )
  );