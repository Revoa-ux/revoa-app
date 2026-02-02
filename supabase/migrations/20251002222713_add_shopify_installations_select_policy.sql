/*
  # Add SELECT policy for shopify_installations

  This migration adds a missing RLS policy that allows users to read their own Shopify installation data.

  ## Changes
  - Add SELECT policy for authenticated users to view their own installations
  
  ## Security
  - Users can only see installations where user_id matches their auth.uid()
*/

-- Add SELECT policy for users to read their own installations
CREATE POLICY "Users can view their own installations"
  ON shopify_installations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
