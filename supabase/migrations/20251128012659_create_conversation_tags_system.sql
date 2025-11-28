/*
  # Create Conversation Tags System

  1. New Tables
    - `conversation_tags`
      - Tag definitions with name, color, icon, category
      - Categories: priority, type, status, segment
    - `conversation_tag_assignments`
      - Links tags to conversations (chats)
      - Tracks which admin assigned the tag

  2. Security
    - Enable RLS on both tables
    - Admins can read all tags and assignments
    - Admins can create/update/delete tag assignments
    - Super admins can manage tag definitions

  3. Initial Tag Seeds
    - 10 useful tags across different categories
*/

-- Create conversation_tags table
CREATE TABLE IF NOT EXISTS conversation_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL,
  icon text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('priority', 'type', 'status', 'segment')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create conversation_tag_assignments table
CREATE TABLE IF NOT EXISTS conversation_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES conversation_tags(id) ON DELETE CASCADE,
  assigned_by_admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(chat_id, tag_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversation_tags_category ON conversation_tags(category);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_is_active ON conversation_tags(is_active);
CREATE INDEX IF NOT EXISTS idx_conversation_tag_assignments_chat_id ON conversation_tag_assignments(chat_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tag_assignments_tag_id ON conversation_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tag_assignments_admin_id ON conversation_tag_assignments(assigned_by_admin_id);

-- Enable RLS
ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_tags
CREATE POLICY "Admins can view all tags"
  ON conversation_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Super admins can create tags"
  ON conversation_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can update tags"
  ON conversation_tags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can delete tags"
  ON conversation_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );

-- RLS Policies for conversation_tag_assignments
CREATE POLICY "Admins can view tag assignments"
  ON conversation_tag_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can create tag assignments"
  ON conversation_tag_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
    AND assigned_by_admin_id = auth.uid()
  );

CREATE POLICY "Admins can delete tag assignments"
  ON conversation_tag_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_conversation_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_tags_updated_at ON conversation_tags;
CREATE TRIGGER trigger_update_conversation_tags_updated_at
  BEFORE UPDATE ON conversation_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_tags_updated_at();

-- Insert initial tags

-- Priority Tags
INSERT INTO conversation_tags (name, color, icon, description, category, sort_order) VALUES
('High Priority', '#EF4444', 'AlertCircle', 'Urgent conversation requiring immediate attention', 'priority', 1),
('Urgent Response Needed', '#F97316', 'Clock', 'Time-sensitive issue that needs quick response', 'priority', 2),
('Low Priority', '#3B82F6', 'Info', 'Non-urgent conversation that can be handled later', 'priority', 3);

-- Issue Type Tags
INSERT INTO conversation_tags (name, color, icon, description, category, sort_order) VALUES
('Technical Issue', '#8B5CF6', 'Wrench', 'Technical problem or bug report', 'type', 4),
('Billing Question', '#10B981', 'DollarSign', 'Payment or invoice related inquiry', 'type', 5),
('Product Inquiry', '#14B8A6', 'Package', 'Questions about products or inventory', 'type', 6);

-- Customer Segment Tags
INSERT INTO conversation_tags (name, color, icon, description, category, sort_order) VALUES
('VIP Customer', '#F59E0B', 'Crown', 'High-value customer requiring special attention', 'segment', 7),
('New Customer', '#06B6D4', 'UserPlus', 'Recently onboarded customer', 'segment', 8);

-- Follow-up Tags
INSERT INTO conversation_tags (name, color, icon, description, category, sort_order) VALUES
('Follow Up Required', '#EAB308', 'Bell', 'Needs follow-up action from admin', 'status', 9),
('Waiting on Customer', '#6B7280', 'MessageSquare', 'Waiting for customer response', 'status', 10);

-- Comments for documentation
COMMENT ON TABLE conversation_tags IS 'Tag definitions for categorizing and organizing conversations';
COMMENT ON TABLE conversation_tag_assignments IS 'Links tags to specific conversations with admin tracking';
COMMENT ON COLUMN conversation_tags.category IS 'Tag category: priority, type, status, or segment';
COMMENT ON COLUMN conversation_tags.color IS 'Hex color code for visual identification';
COMMENT ON COLUMN conversation_tags.icon IS 'Lucide icon name for visual representation';
