/*
  # Allow Users to Create Their Own Invoices

  1. Security Changes
    - Add INSERT policy for users to create invoices for themselves
    - Specifically for purchase_order type invoices from inventory tracker
    
  2. Notes
    - Users can only insert invoices where user_id matches their auth.uid()
    - This enables the inventory tracker purchase order functionality
*/

CREATE POLICY "Users can create their own invoices"
  ON invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
