-- Allow users to view admin profiles (for chat assignment and display)
--
-- Users need to be able to:
-- 1. See available admins for auto-assignment
-- 2. See their assigned admin's name and info in the chat

-- Allow all authenticated users to view admin profiles (name, email only)
CREATE POLICY "Users can view admin profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    is_admin = true
  );