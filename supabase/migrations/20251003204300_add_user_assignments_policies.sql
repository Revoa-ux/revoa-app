-- Add RLS policies for user_assignments table
--
-- Users can view their own assignment
-- System can create assignments
-- Admins can view and update assignments

-- Users can view their own assignment
CREATE POLICY "Users can view own assignment"
  ON user_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view assignments they're part of
CREATE POLICY "Admins can view their assignments"
  ON user_assignments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = admin_id AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- Allow authenticated users to insert their own assignment (for auto-assignment)
CREATE POLICY "Users can create own assignment"
  ON user_assignments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can update assignments
CREATE POLICY "Admins can update assignments"
  ON user_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_assignments_user_id ON user_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_assignments_admin_id ON user_assignments(admin_id);