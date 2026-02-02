/*
  # Fix Security Issues - Part 2: RLS Performance Optimization

  1. Optimize RLS Policies
    - Replace auth.uid() with (select auth.uid()) to prevent re-evaluation per row
    - Dramatically improves query performance at scale
    - Affects multiple tables with user-based access control

  2. Tables Updated
    - shopify_orders
    - ad_conversions
    - conversion_events
    - ai_patterns_account
    - balance_accounts
    - balance_transactions
    - order_line_items
    - invoice_line_items
    - payment_intents
*/

-- shopify_orders policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.shopify_orders;
CREATE POLICY "Users can view own orders"
  ON public.shopify_orders
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own orders" ON public.shopify_orders;
CREATE POLICY "Users can insert own orders"
  ON public.shopify_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own orders" ON public.shopify_orders;
CREATE POLICY "Users can update own orders"
  ON public.shopify_orders
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ad_conversions policies
DROP POLICY IF EXISTS "Users can view own conversions" ON public.ad_conversions;
CREATE POLICY "Users can view own conversions"
  ON public.ad_conversions
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own conversions" ON public.ad_conversions;
CREATE POLICY "Users can insert own conversions"
  ON public.ad_conversions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own conversions" ON public.ad_conversions;
CREATE POLICY "Users can update own conversions"
  ON public.ad_conversions
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- conversion_events policies
DROP POLICY IF EXISTS "Users can view own conversion events" ON public.conversion_events;
CREATE POLICY "Users can view own conversion events"
  ON public.conversion_events
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own conversion events" ON public.conversion_events;
CREATE POLICY "Users can insert own conversion events"
  ON public.conversion_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own conversion events" ON public.conversion_events;
CREATE POLICY "Users can update own conversion events"
  ON public.conversion_events
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ai_patterns_account policies
DROP POLICY IF EXISTS "Users can view own patterns" ON public.ai_patterns_account;
CREATE POLICY "Users can view own patterns"
  ON public.ai_patterns_account
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own patterns" ON public.ai_patterns_account;
CREATE POLICY "Users can insert own patterns"
  ON public.ai_patterns_account
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own patterns" ON public.ai_patterns_account;
CREATE POLICY "Users can update own patterns"
  ON public.ai_patterns_account
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- balance_accounts policies
DROP POLICY IF EXISTS "Users can view own balance account" ON public.balance_accounts;
CREATE POLICY "Users can view own balance account"
  ON public.balance_accounts
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all balance accounts" ON public.balance_accounts;
CREATE POLICY "Admins can view all balance accounts"
  ON public.balance_accounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- balance_transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.balance_transactions;
CREATE POLICY "Users can view own transactions"
  ON public.balance_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.balance_transactions;
CREATE POLICY "Admins can view all transactions"
  ON public.balance_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- order_line_items policies
DROP POLICY IF EXISTS "Users can view own order line items" ON public.order_line_items;
CREATE POLICY "Users can view own order line items"
  ON public.order_line_items
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all order line items" ON public.order_line_items;
CREATE POLICY "Admins can view all order line items"
  ON public.order_line_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can update order line items" ON public.order_line_items;
CREATE POLICY "Admins can update order line items"
  ON public.order_line_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- invoice_line_items policies
DROP POLICY IF EXISTS "Users can view own invoice line items" ON public.invoice_line_items;
CREATE POLICY "Users can view own invoice line items"
  ON public.invoice_line_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view all invoice line items" ON public.invoice_line_items;
CREATE POLICY "Admins can view all invoice line items"
  ON public.invoice_line_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can create invoice line items" ON public.invoice_line_items;
CREATE POLICY "Admins can create invoice line items"
  ON public.invoice_line_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- payment_intents policies
DROP POLICY IF EXISTS "Users can view own payment intents" ON public.payment_intents;
CREATE POLICY "Users can view own payment intents"
  ON public.payment_intents
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all payment intents" ON public.payment_intents;
CREATE POLICY "Admins can view all payment intents"
  ON public.payment_intents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can update payment intents" ON public.payment_intents;
CREATE POLICY "Admins can update payment intents"
  ON public.payment_intents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can view all payment intents" ON public.payment_intents;
CREATE POLICY "Super admins can view all payment intents"
  ON public.payment_intents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_super_admin = true
    )
  );