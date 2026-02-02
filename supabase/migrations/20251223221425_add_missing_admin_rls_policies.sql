/*
  # Add Missing Admin RLS Policies for Resolution Center

  ## Problem
  Admins cannot view customer order information or bot flow sessions when viewing
  threads in the Resolution Center because some RLS policies are missing.

  ## Changes

  1. **shopify_orders table**
     - Add policy for admins to view orders for users they're assigned to
     - Add policy for super admins to view all orders

  2. **thread_flow_sessions table**
     - Add policy for super admins to view all flow sessions

  3. **flow_responses table**
     - Add policy for super admins to view all flow responses

  ## Security
  - Admins can only view data for users they are assigned to
  - Super admins can view all data
  - User data remains protected from unauthorized access
*/

-- ============================================================================
-- SHOPIFY ORDERS: Add admin access policies
-- ============================================================================

-- Admins can view orders for users they're assigned to
CREATE POLICY "Admins can view assigned user orders"
  ON shopify_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_assignments ua
      WHERE ua.user_id = shopify_orders.user_id
      AND ua.admin_id = auth.uid()
    )
  );

-- Super admins can view all orders
CREATE POLICY "Super admins can view all orders"
  ON shopify_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- ============================================================================
-- THREAD FLOW SESSIONS: Add super admin access
-- ============================================================================

-- Super admins can view all flow sessions
CREATE POLICY "Super admins can view all flow sessions"
  ON thread_flow_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- ============================================================================
-- FLOW RESPONSES: Add super admin access
-- ============================================================================

-- Super admins can view all flow responses
CREATE POLICY "Super admins can view all flow responses"
  ON flow_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );