/*
  # Optimize RLS Policies - Part 1 (Core Tables)

  1. Performance Optimization
    - Replace direct `auth.uid()` calls with `(select auth.uid())`
    - This prevents re-evaluation for each row, improving query performance at scale
    - Applies to admin_users, shopify_installations, chats, ad_accounts

  2. Changes
    - Drop existing policies
    - Recreate with optimized auth function calls

  3. Security
    - No changes to authorization logic
    - Only optimizes how auth checks are performed
*/

-- admin_users policies
DROP POLICY IF EXISTS "Admins can update own profile" ON public.admin_users;
CREATE POLICY "Admins can update own profile"
  ON public.admin_users FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- shopify_installations policies
DROP POLICY IF EXISTS "Users can view their own installations" ON public.shopify_installations;
CREATE POLICY "Users can view their own installations"
  ON public.shopify_installations FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own installations" ON public.shopify_installations;
CREATE POLICY "Users can update their own installations"
  ON public.shopify_installations FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own installations" ON public.shopify_installations;
CREATE POLICY "Users can delete their own installations"
  ON public.shopify_installations FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- chats policies
DROP POLICY IF EXISTS "Users can view own chats" ON public.chats;
CREATE POLICY "Users can view own chats"
  ON public.chats FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view assigned chats" ON public.chats;
CREATE POLICY "Admins can view assigned chats"
  ON public.chats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_assignments
      WHERE user_assignments.user_id = chats.user_id
      AND user_assignments.admin_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create own chats" ON public.chats;
CREATE POLICY "Users can create own chats"
  ON public.chats FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own chats" ON public.chats;
CREATE POLICY "Users can update own chats"
  ON public.chats FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can update assigned chats" ON public.chats;
CREATE POLICY "Admins can update assigned chats"
  ON public.chats FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_assignments
      WHERE user_assignments.user_id = chats.user_id
      AND user_assignments.admin_id = (select auth.uid())
    )
  );

-- ad_accounts policies
DROP POLICY IF EXISTS "Users can view own ad accounts" ON public.ad_accounts;
CREATE POLICY "Users can view own ad accounts"
  ON public.ad_accounts FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own ad accounts" ON public.ad_accounts;
CREATE POLICY "Users can insert own ad accounts"
  ON public.ad_accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own ad accounts" ON public.ad_accounts;
CREATE POLICY "Users can update own ad accounts"
  ON public.ad_accounts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own ad accounts" ON public.ad_accounts;
CREATE POLICY "Users can delete own ad accounts"
  ON public.ad_accounts FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));