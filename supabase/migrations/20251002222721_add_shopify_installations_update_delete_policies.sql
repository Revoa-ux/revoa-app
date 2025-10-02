/*
  # Add UPDATE and DELETE policies for shopify_installations

  This migration adds RLS policies that allow users to update and delete their own Shopify installations.

  ## Changes
  - Add UPDATE policy for authenticated users to modify their own installations
  - Add DELETE policy for authenticated users to remove their own installations
  
  ## Security
  - Users can only modify/delete installations where user_id matches their auth.uid()
*/

-- Add UPDATE policy for users to update their own installations
CREATE POLICY "Users can update their own installations"
  ON shopify_installations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add DELETE policy for users to delete their own installations
CREATE POLICY "Users can delete their own installations"
  ON shopify_installations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
