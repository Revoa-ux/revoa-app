/*
  # Add Product Approval System

  1. Changes
    - Add approval_status to products table
    - Add approval_history table
    - Add notification triggers
    - Add RLS policies

  2. Security
    - Enable RLS
    - Add proper policies
    - Add audit logging
*/

-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create product variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text NOT NULL,
  item_cost numeric(20,2) NOT NULL,
  shipping_cost numeric(20,2) NOT NULL,
  recommended_price numeric(20,2) NOT NULL,
  images text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create product approval history table
CREATE TABLE IF NOT EXISTS product_approval_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid NOT NULL REFERENCES auth.users(id),
  reviewed_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  comments text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can create products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Super admins can approve products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND admin_role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND admin_role = 'super_admin'
    )
  );

CREATE POLICY "Admins can view all products"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Users can only view approved products"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    approval_status = 'approved'
    OR created_by = auth.uid()
  );

-- Create function to notify super admins
CREATE OR REPLACE FUNCTION notify_super_admins_of_new_product()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    metadata
  )
  SELECT
    profiles.user_id,
    'product_approval',
    'New Product Pending Approval',
    'A new product has been submitted for approval: ' || NEW.name,
    jsonb_build_object(
      'product_id', NEW.id,
      'product_name', NEW.name,
      'submitted_by', NEW.created_by
    )
  FROM user_profiles profiles
  WHERE profiles.admin_role = 'super_admin';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new product notifications
CREATE TRIGGER notify_super_admins_new_product
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION notify_super_admins_of_new_product();

-- Create function to log approval history
CREATE OR REPLACE FUNCTION log_product_approval_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    INSERT INTO product_approval_history (
      product_id,
      status,
      reviewed_by,
      comments,
      metadata
    ) VALUES (
      NEW.id,
      NEW.approval_status,
      auth.uid(),
      CASE 
        WHEN NEW.approval_status = 'approved' THEN 'Product approved'
        WHEN NEW.approval_status = 'rejected' THEN 'Product rejected'
        ELSE NULL
      END,
      jsonb_build_object(
        'previous_status', OLD.approval_status,
        'new_status', NEW.approval_status,
        'changed_at', NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for approval history
CREATE TRIGGER log_product_approval_changes
  AFTER UPDATE OF approval_status ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_product_approval_change();

-- Create indexes
CREATE INDEX idx_products_approval_status ON products(approval_status);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_created_by ON products(created_by);
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_approval_history_product_id ON product_approval_history(product_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Add helpful comments
COMMENT ON TABLE products IS 'Stores product information with approval workflow';
COMMENT ON TABLE product_variants IS 'Stores product variant details';
COMMENT ON TABLE product_approval_history IS 'Tracks product approval status changes';
COMMENT ON TABLE notifications IS 'Stores user notifications';