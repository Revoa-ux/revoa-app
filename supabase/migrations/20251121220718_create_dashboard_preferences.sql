/*
  # Create Dashboard Preferences Table

  ## Overview
  Stores user preferences for customizable dashboard views, including which metrics
  to display, their order, and view settings (collapsed/expanded).

  ## New Tables

  ### `dashboard_preferences`
  Stores user-specific dashboard customization preferences

  **Columns:**
  - `id` (uuid, primary key)
  - `user_id` (uuid) - The user who owns these preferences
  - `dashboard_type` (text) - Type of dashboard: 'attribution', 'ad_reports', 'main'
  - `visible_metrics` (jsonb) - Array of metric IDs that should be displayed
  - `metric_order` (jsonb) - Array defining the order of metrics
  - `view_settings` (jsonb) - Additional settings like collapsed state, layout type
  - `updated_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Indexes
  - `idx_dashboard_prefs_user` - Fast lookup by user_id and dashboard_type

  ## Security
  - RLS enabled
  - Users can only view/edit their own preferences
*/

-- Create dashboard_preferences table
CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  dashboard_type text NOT NULL,
  visible_metrics jsonb DEFAULT '[]'::jsonb,
  metric_order jsonb DEFAULT '[]'::jsonb,
  view_settings jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, dashboard_type)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_prefs_user 
  ON dashboard_preferences(user_id, dashboard_type);

-- Enable RLS
ALTER TABLE dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own dashboard preferences"
  ON dashboard_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own dashboard preferences"
  ON dashboard_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own dashboard preferences"
  ON dashboard_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own dashboard preferences"
  ON dashboard_preferences
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_dashboard_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_dashboard_preferences_updated_at_trigger 
  ON dashboard_preferences;

CREATE TRIGGER update_dashboard_preferences_updated_at_trigger
  BEFORE UPDATE ON dashboard_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_preferences_updated_at();
