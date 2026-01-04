/*
  # User Store Configurations

  ## Overview
  Store-level configurations for merchant policies, fees, and return settings.

  ## New Table: user_store_configurations

  Stores merchant-specific configuration that applies across all their products:
  - `id` (uuid, primary key)
  - `user_id` (uuid, references user_profiles) - UNIQUE
  - `restocking_fee_type` (text) - 'none', 'percentage', 'fixed'
  - `restocking_fee_percent` (numeric) - For percentage-based fees (0-100)
  - `restocking_fee_fixed` (numeric) - For fixed dollar amount fees
  - `return_warehouse_address` (text) - Warehouse address for returns
  - `carrier_name` (text) - Default carrier name
  - `carrier_phone_number` (text) - Carrier phone support
  - `store_name` (text) - Store display name
  - `support_email` (text) - Customer support email
  - `created_at`, `updated_at` (timestamptz)

  ## Security
  - Enable RLS
  - Users can view and update their own configuration
  - Admins can view all configurations
*/

-- =====================================================
-- CREATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_store_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,

  -- Restocking Fee Configuration
  restocking_fee_type text DEFAULT 'none' CHECK (restocking_fee_type IN ('none', 'percentage', 'fixed')),
  restocking_fee_percent numeric DEFAULT 0 CHECK (restocking_fee_percent >= 0 AND restocking_fee_percent <= 100),
  restocking_fee_fixed numeric DEFAULT 0 CHECK (restocking_fee_fixed >= 0),

  -- Return & Shipping Configuration
  return_warehouse_address text,
  carrier_name text,
  carrier_phone_number text,

  -- Store Information
  store_name text,
  support_email text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- One config per user
  UNIQUE(user_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_store_configs_user ON user_store_configurations(user_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_store_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own store configuration"
  ON user_store_configurations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own store configuration"
  ON user_store_configurations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own store configuration"
  ON user_store_configurations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all store configurations"
  ON user_store_configurations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- =====================================================
-- UPDATE TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS update_store_configs_updated_at ON user_store_configurations;
CREATE TRIGGER update_store_configs_updated_at
  BEFORE UPDATE ON user_store_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DEFAULT CONFIGURATIONS
-- =====================================================

-- Insert default configurations for existing users who don't have one yet
INSERT INTO user_store_configurations (user_id, restocking_fee_type, return_warehouse_address)
SELECT
  up.user_id,
  'none',
  '5130 E. Santa Ana Street, Ontario, CA 91761'
FROM user_profiles up
WHERE up.is_admin = false
  AND NOT EXISTS (
    SELECT 1 FROM user_store_configurations usc
    WHERE usc.user_id = up.user_id
  )
ON CONFLICT (user_id) DO NOTHING;
