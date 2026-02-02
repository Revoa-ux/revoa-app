/*
  # Create 3PL Order Fulfillment System with Mabang Integration

  ## Overview
  Complete system for exporting orders to Mabang 3PL, importing tracking, and auto-syncing to Shopify.

  ## New Tables
  
  ### `mabang_export_batches`
  Tracks export batches sent to Mabang 3PL
  - `id` (uuid, PK) - Unique batch identifier
  - `admin_id` (uuid) - Admin who created the export
  - `export_filename` (text) - Generated filename
  - `order_ids` (text[]) - Array of order IDs in batch
  - `order_count` (integer) - Count of orders
  - `merchant_ids` (text[]) - Merchants included in export
  - `exported_at` (timestamptz) - Export timestamp
  - `tracking_imported` (boolean) - Whether tracking has been imported back
  - `tracking_import_filename` (text) - Tracking import filename
  - `tracking_imported_at` (timestamptz) - When tracking was imported
  - `file_path` (text) - Storage path if stored
  - `notes` (text) - Additional notes

  ### `order_operation_permissions`
  Permission system for order operations by admin
  - `id` (uuid, PK)
  - `admin_id` (uuid) - Admin user
  - `can_export_orders` (boolean) - Permission to export to Mabang
  - `can_import_tracking` (boolean) - Permission to import tracking
  - `can_sync_to_shopify` (boolean) - Permission to sync to Shopify
  - `can_view_all_merchants` (boolean) - View all merchants vs assigned only
  - `created_by_super_admin_id` (uuid) - Who granted permissions
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Modified Tables
  
  ### `shopify_orders`
  Added columns:
  - `exported_to_3pl` (boolean) - Marked when exported to Mabang
  - `exported_at` (timestamptz) - Export timestamp
  - `exported_by_admin_id` (uuid) - Who exported it
  - `tracking_imported` (boolean) - Whether tracking received back
  - `tracking_imported_at` (timestamptz) - When tracking imported
  - `last_synced_to_shopify_at` (timestamptz) - Last Shopify sync

  ### `shopify_order_fulfillments`
  Added columns:
  - `imported_from_file` (text) - Source filename for tracking
  - `import_timestamp` (timestamptz) - When imported
  - `mabang_batch_id` (uuid) - Link to export batch
  - `synced_to_shopify` (boolean) - Whether synced back to Shopify
  - `synced_to_shopify_at` (timestamptz) - Sync timestamp
  - `sync_error` (text) - Error message if sync failed
  - `sync_retry_count` (integer) - Number of retry attempts

  ## Security
  - Enable RLS on all new tables
  - Super admins can manage all data
  - Regular admins restricted to assigned merchants
  - Audit trail for all operations

  ## Important Notes
  1. Supports Mabang Excel format for export/import
  2. Integrates with YunExpress and other logistics companies via Mabang
  3. Auto-sync to Shopify after tracking import
  4. Permission-based access control for agents
  5. Merchant filtering for non-super-admins
*/

-- ============================================================================
-- 1. UPDATE EXISTING TABLES
-- ============================================================================

-- Add 3PL export tracking to shopify_orders
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'exported_to_3pl'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN exported_to_3pl boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'exported_at'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN exported_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'exported_by_admin_id'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN exported_by_admin_id uuid REFERENCES user_profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'tracking_imported'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN tracking_imported boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'tracking_imported_at'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN tracking_imported_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'last_synced_to_shopify_at'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN last_synced_to_shopify_at timestamptz;
  END IF;
END $$;

-- Add import and sync tracking to shopify_order_fulfillments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_order_fulfillments' AND column_name = 'imported_from_file'
  ) THEN
    ALTER TABLE shopify_order_fulfillments ADD COLUMN imported_from_file text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_order_fulfillments' AND column_name = 'import_timestamp'
  ) THEN
    ALTER TABLE shopify_order_fulfillments ADD COLUMN import_timestamp timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_order_fulfillments' AND column_name = 'mabang_batch_id'
  ) THEN
    ALTER TABLE shopify_order_fulfillments ADD COLUMN mabang_batch_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_order_fulfillments' AND column_name = 'synced_to_shopify'
  ) THEN
    ALTER TABLE shopify_order_fulfillments ADD COLUMN synced_to_shopify boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_order_fulfillments' AND column_name = 'synced_to_shopify_at'
  ) THEN
    ALTER TABLE shopify_order_fulfillments ADD COLUMN synced_to_shopify_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_order_fulfillments' AND column_name = 'sync_error'
  ) THEN
    ALTER TABLE shopify_order_fulfillments ADD COLUMN sync_error text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_order_fulfillments' AND column_name = 'sync_retry_count'
  ) THEN
    ALTER TABLE shopify_order_fulfillments ADD COLUMN sync_retry_count integer DEFAULT 0;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopify_orders_exported_to_3pl 
  ON shopify_orders(exported_to_3pl, exported_at) 
  WHERE exported_to_3pl = true;

CREATE INDEX IF NOT EXISTS idx_shopify_orders_tracking_imported 
  ON shopify_orders(tracking_imported, tracking_imported_at) 
  WHERE tracking_imported = true;

CREATE INDEX IF NOT EXISTS idx_shopify_order_fulfillments_sync_status 
  ON shopify_order_fulfillments(synced_to_shopify, synced_to_shopify_at) 
  WHERE synced_to_shopify = false;

-- ============================================================================
-- 2. CREATE NEW TABLES
-- ============================================================================

-- Mabang export batches table
CREATE TABLE IF NOT EXISTS mabang_export_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES user_profiles(id) NOT NULL,
  export_filename text NOT NULL,
  order_ids text[] NOT NULL DEFAULT '{}',
  order_count integer NOT NULL DEFAULT 0,
  merchant_ids text[] NOT NULL DEFAULT '{}',
  exported_at timestamptz NOT NULL DEFAULT now(),
  tracking_imported boolean DEFAULT false,
  tracking_import_filename text,
  tracking_imported_at timestamptz,
  file_path text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order operation permissions table
CREATE TABLE IF NOT EXISTS order_operation_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES user_profiles(id) UNIQUE NOT NULL,
  can_export_orders boolean DEFAULT false,
  can_import_tracking boolean DEFAULT false,
  can_sync_to_shopify boolean DEFAULT true,
  can_view_all_merchants boolean DEFAULT false,
  created_by_super_admin_id uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key for mabang_batch_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'shopify_order_fulfillments_mabang_batch_id_fkey'
  ) THEN
    ALTER TABLE shopify_order_fulfillments 
      ADD CONSTRAINT shopify_order_fulfillments_mabang_batch_id_fkey 
      FOREIGN KEY (mabang_batch_id) REFERENCES mabang_export_batches(id);
  END IF;
END $$;

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_mabang_export_batches_admin_id 
  ON mabang_export_batches(admin_id, exported_at DESC);

CREATE INDEX IF NOT EXISTS idx_mabang_export_batches_tracking_imported 
  ON mabang_export_batches(tracking_imported) 
  WHERE tracking_imported = false;

CREATE INDEX IF NOT EXISTS idx_order_operation_permissions_admin_id 
  ON order_operation_permissions(admin_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE mabang_export_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_operation_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for mabang_export_batches
CREATE POLICY "Super admins can view all export batches"
  ON mabang_export_batches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

CREATE POLICY "Admins can view their own export batches"
  ON mabang_export_batches FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Admins can insert export batches"
  ON mabang_export_batches FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins can update their own export batches"
  ON mabang_export_batches FOR UPDATE
  TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Super admins can update all export batches"
  ON mabang_export_batches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Policies for order_operation_permissions
CREATE POLICY "Users can view their own permissions"
  ON order_operation_permissions FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Super admins can view all permissions"
  ON order_operation_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can insert permissions"
  ON order_operation_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can update permissions"
  ON order_operation_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can delete permissions"
  ON order_operation_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- ============================================================================
-- 4. FUNCTIONS
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mabang_export_batches_updated_at()
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

CREATE OR REPLACE FUNCTION update_order_operation_permissions_updated_at()
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

-- Create triggers
DROP TRIGGER IF EXISTS set_mabang_export_batches_updated_at ON mabang_export_batches;
CREATE TRIGGER set_mabang_export_batches_updated_at
  BEFORE UPDATE ON mabang_export_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_mabang_export_batches_updated_at();

DROP TRIGGER IF EXISTS set_order_operation_permissions_updated_at ON order_operation_permissions;
CREATE TRIGGER set_order_operation_permissions_updated_at
  BEFORE UPDATE ON order_operation_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_order_operation_permissions_updated_at();

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has permission for order operations
CREATE OR REPLACE FUNCTION has_order_operation_permission(
  user_id uuid,
  permission_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_super_admin boolean;
  has_permission boolean;
BEGIN
  -- Check if user is super admin (always has all permissions)
  SELECT is_super_admin INTO is_super_admin
  FROM user_profiles
  WHERE id = user_id;

  IF is_super_admin THEN
    RETURN true;
  END IF;

  -- Check specific permission
  CASE permission_type
    WHEN 'export_orders' THEN
      SELECT can_export_orders INTO has_permission
      FROM order_operation_permissions
      WHERE admin_id = user_id;
    WHEN 'import_tracking' THEN
      SELECT can_import_tracking INTO has_permission
      FROM order_operation_permissions
      WHERE admin_id = user_id;
    WHEN 'sync_to_shopify' THEN
      SELECT can_sync_to_shopify INTO has_permission
      FROM order_operation_permissions
      WHERE admin_id = user_id;
    WHEN 'view_all_merchants' THEN
      SELECT can_view_all_merchants INTO has_permission
      FROM order_operation_permissions
      WHERE admin_id = user_id;
    ELSE
      RETURN false;
  END CASE;

  RETURN COALESCE(has_permission, false);
END;
$$;

-- Function to get orders eligible for export
CREATE OR REPLACE FUNCTION get_orders_for_export(
  admin_user_id uuid DEFAULT NULL,
  merchant_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  order_number text,
  shopify_order_id text,
  user_id uuid,
  customer_email text,
  customer_first_name text,
  customer_last_name text,
  customer_phone text,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_state text,
  shipping_zip text,
  shipping_country text,
  total_price numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_super_admin boolean;
BEGIN
  -- Check if requesting user is super admin
  SELECT user_profiles.is_super_admin INTO is_super_admin
  FROM user_profiles
  WHERE user_profiles.id = admin_user_id;

  RETURN QUERY
  SELECT 
    so.id,
    so.order_number,
    so.shopify_order_id,
    so.user_id,
    so.customer_email,
    so.customer_first_name,
    so.customer_last_name,
    so.customer_phone,
    so.shipping_address_line1,
    so.shipping_address_line2,
    so.shipping_city,
    so.shipping_state,
    so.shipping_zip,
    so.shipping_country,
    so.total_price,
    so.created_at
  FROM shopify_orders so
  WHERE so.fulfillment_status = 'UNFULFILLED'
    AND so.exported_to_3pl = false
    AND so.financial_status IN ('PAID', 'AUTHORIZED')
    AND so.cancelled_at IS NULL
    AND (
      -- Super admin can see all
      is_super_admin
      -- Filter by specific merchant if provided
      OR (merchant_user_id IS NOT NULL AND so.user_id = merchant_user_id)
      -- Regular admin sees only assigned merchants
      OR (
        NOT is_super_admin 
        AND admin_user_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM user_assignments
          WHERE user_assignments.admin_id = admin_user_id
          AND user_assignments.user_id = so.user_id
        )
      )
    )
  ORDER BY so.created_at ASC;
END;
$$;