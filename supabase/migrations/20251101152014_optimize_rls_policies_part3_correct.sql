/*
  # Optimize RLS Policies - Part 3 (Invoices, Messages, Products) - Correct

  1. Performance Optimization
    - Replace direct `auth.uid()` calls with `(select auth.uid())`
    - Optimizes invoices, user_invoice_history, user_assignments, messages

  2. Changes
    - Drop existing policies
    - Recreate with optimized auth function calls
    - Correct: sender is text ('user' or 'team'), chats has admin_id directly
*/

-- invoices policies
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
CREATE POLICY "Users can view their own invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Team members can manage invoices" ON public.invoices;
CREATE POLICY "Team members can manage invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- user_invoice_history policies
DROP POLICY IF EXISTS "Users can view their own invoice history" ON public.user_invoice_history;
CREATE POLICY "Users can view their own invoice history"
  ON public.user_invoice_history FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Team members can manage invoice history" ON public.user_invoice_history;
CREATE POLICY "Team members can manage invoice history"
  ON public.user_invoice_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- user_assignments policies
DROP POLICY IF EXISTS "Users can view own assignment" ON public.user_assignments;
CREATE POLICY "Users can view own assignment"
  ON public.user_assignments FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view their assignments" ON public.user_assignments;
CREATE POLICY "Admins can view their assignments"
  ON public.user_assignments FOR SELECT
  TO authenticated
  USING (admin_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own assignment" ON public.user_assignments;
CREATE POLICY "Users can create own assignment"
  ON public.user_assignments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can update assignments" ON public.user_assignments;
CREATE POLICY "Admins can update assignments"
  ON public.user_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- shopify_sync_logs policies (uses store_id which connects to shopify_installations)
DROP POLICY IF EXISTS "Users can view their own sync logs" ON public.shopify_sync_logs;
CREATE POLICY "Users can view their own sync logs"
  ON public.shopify_sync_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shopify_installations
      WHERE shopify_installations.id = shopify_sync_logs.store_id
      AND shopify_installations.user_id = (select auth.uid())
    )
  );

-- messages policies
DROP POLICY IF EXISTS "Users can read own chat messages" ON public.messages;
CREATE POLICY "Users can read own chat messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can read assigned chat messages" ON public.messages;
CREATE POLICY "Admins can read assigned chat messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.admin_id = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = (select auth.uid())
        AND user_profiles.is_admin = true
      )
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender = 'user' AND
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = chat_id
      AND chats.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can send messages" ON public.messages;
CREATE POLICY "Admins can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender = 'team' AND
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = chat_id
      AND chats.admin_id = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = (select auth.uid())
        AND user_profiles.is_admin = true
      )
    )
  );

DROP POLICY IF EXISTS "Users can update message status" ON public.messages;
CREATE POLICY "Users can update message status"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can update message status" ON public.messages;
CREATE POLICY "Admins can update message status"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.admin_id = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = (select auth.uid())
        AND user_profiles.is_admin = true
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.admin_id = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = (select auth.uid())
        AND user_profiles.is_admin = true
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    (sender = 'user' AND EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = (select auth.uid())
    ))
    OR
    (sender = 'team' AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.is_admin = true
    ))
  )
  WITH CHECK (true);