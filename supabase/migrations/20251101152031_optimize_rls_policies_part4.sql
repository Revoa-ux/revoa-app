/*
  # Optimize RLS Policies - Part 4 (Products, Quotes, Suppliers, Transactions)

  1. Performance Optimization
    - Replace direct `auth.uid()` calls with `(select auth.uid())`
    - Optimizes products, product_quotes, suppliers, marketplace_transactions

  2. Changes
    - Drop existing policies
    - Recreate with optimized auth function calls
*/

-- products policies
DROP POLICY IF EXISTS "Users can only view approved products" ON public.products;
CREATE POLICY "Users can only view approved products"
  ON public.products FOR SELECT
  TO authenticated
  USING (
    approval_status = 'approved' 
    AND NOT EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can create products" ON public.products;
CREATE POLICY "Admins can create products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can approve products" ON public.products;
CREATE POLICY "Super admins can approve products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_super_admin = true
    )
  );

-- product_quotes policies
DROP POLICY IF EXISTS "Users can read own quotes" ON public.product_quotes;
CREATE POLICY "Users can read own quotes"
  ON public.product_quotes FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can read all quotes" ON public.product_quotes;
CREATE POLICY "Admins can read all quotes"
  ON public.product_quotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create quotes" ON public.product_quotes;
CREATE POLICY "Users can create quotes"
  ON public.product_quotes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own quotes status" ON public.product_quotes;
CREATE POLICY "Users can update own quotes status"
  ON public.product_quotes FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can update all quotes" ON public.product_quotes;
CREATE POLICY "Admins can update all quotes"
  ON public.product_quotes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- suppliers policies
DROP POLICY IF EXISTS "Admins can view all suppliers" ON public.suppliers;
CREATE POLICY "Admins can view all suppliers"
  ON public.suppliers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can create suppliers" ON public.suppliers;
CREATE POLICY "Admins can create suppliers"
  ON public.suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can update suppliers" ON public.suppliers;
CREATE POLICY "Admins can update suppliers"
  ON public.suppliers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- marketplace_transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.marketplace_transactions;
CREATE POLICY "Users can view own transactions"
  ON public.marketplace_transactions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.marketplace_transactions;
CREATE POLICY "Admins can view all transactions"
  ON public.marketplace_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can create transactions" ON public.marketplace_transactions;
CREATE POLICY "Admins can create transactions"
  ON public.marketplace_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can update transactions" ON public.marketplace_transactions;
CREATE POLICY "Admins can update transactions"
  ON public.marketplace_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );