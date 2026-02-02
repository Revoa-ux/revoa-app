/*
  # Create User Analytics Preferences Table

  1. New Tables
    - `user_analytics_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `active_template` (text) - Name of active template ('executive', 'marketing', 'inventory', 'financial', 'custom')
      - `custom_layout` (jsonb) - Array of card configurations for custom layout
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_analytics_preferences` table
    - Add policies for users to read and update their own preferences
    
  3. Indexes
    - Add index on user_id for fast lookups
    - Add index on updated_at for sorting
*/

-- Create user_analytics_preferences table
CREATE TABLE IF NOT EXISTS user_analytics_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  active_template text NOT NULL DEFAULT 'executive',
  custom_layout jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_analytics_preferences_user_id_unique UNIQUE (user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_analytics_preferences_user_id ON user_analytics_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_preferences_updated_at ON user_analytics_preferences(updated_at DESC);

-- Enable RLS
ALTER TABLE user_analytics_preferences ENABLE ROW LEVEL SECURITY;

-- Policies: Users can read their own preferences
CREATE POLICY "Users can read own analytics preferences"
  ON user_analytics_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies: Users can insert their own preferences
CREATE POLICY "Users can insert own analytics preferences"
  ON user_analytics_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies: Users can update their own preferences
CREATE POLICY "Users can update own analytics preferences"
  ON user_analytics_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_analytics_preferences_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to update updated_at on changes
DROP TRIGGER IF EXISTS update_user_analytics_preferences_updated_at_trigger ON user_analytics_preferences;
CREATE TRIGGER update_user_analytics_preferences_updated_at_trigger
  BEFORE UPDATE ON user_analytics_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_analytics_preferences_updated_at();