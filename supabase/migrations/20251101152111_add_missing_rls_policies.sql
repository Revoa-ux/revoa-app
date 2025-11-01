/*
  # Add Missing RLS Policies

  1. Security Enhancement
    - Add policies for tables that have RLS enabled but no policies
    - Tables: notifications, product_approval_history, product_variants

  2. Policies Added
    - notifications: Users can view own notifications, admins can manage all
    - product_approval_history: Admins can view approval history
    - product_variants: Users can view variants of approved products, admins can manage all

  3. Security
    - All policies use optimized auth checks with (select auth.uid())
*/

-- notifications policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Admins can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can manage all notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- product_approval_history policies
CREATE POLICY "Admins can view approval history"
  ON public.product_approval_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Super admins can view all approval history"
  ON public.product_approval_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_super_admin = true
    )
  );

-- product_variants policies
CREATE POLICY "Users can view variants of approved products"
  ON public.product_variants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_variants.product_id
      AND products.approval_status = 'approved'
    )
  );

CREATE POLICY "Admins can view all product variants"
  ON public.product_variants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can manage product variants"
  ON public.product_variants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );