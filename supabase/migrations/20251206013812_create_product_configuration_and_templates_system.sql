/*
  # Product Configuration & Email Templates System
  
  ## Overview
  Comprehensive system for managing product configurations (factory, logistics, policies)
  and auto-generating customizable email response templates for merchants.
  
  ## New Tables
  
  ### product_factory_configs
  Stores factory partner information for each product
  - `id` (uuid, primary key)
  - `user_id` (uuid, references user_profiles) - merchant who owns this product
  - `product_id` (uuid, references products)
  - `factory_name` (text) - REQUIRED
  - `contact_name` (text)
  - `contact_email` (text)
  - `contact_phone` (text)
  - `address` (text)
  - `notes` (text)
  - `created_by_admin_id` (uuid)
  - `created_at`, `updated_at` (timestamptz)
  
  ### product_logistics_configs
  Simplified logistics settings with coverage toggles
  - `id` (uuid, primary key)
  - `user_id` (uuid, references user_profiles)
  - `product_id` (uuid, references products)
  - `provider_name` (text) - "YunExpress", "Custom", etc.
  - `contact_email` (text)
  - `contact_phone` (text)
  - `covers_lost_items` (boolean DEFAULT false)
  - `covers_damaged_items` (boolean DEFAULT false)
  - `covers_late_delivery` (boolean DEFAULT false)
  - `typical_delivery_days` (text) - e.g., "7-14 days"
  - `notes` (text)
  - `created_by_admin_id` (uuid)
  - `created_at`, `updated_at` (timestamptz)
  
  ### product_policy_variables
  Flexible key-value storage for policy variables used in templates
  - `id` (uuid, primary key)
  - `user_id` (uuid, references user_profiles)
  - `product_id` (uuid, references products)
  - `variable_key` (text) - e.g., "defect_coverage_days"
  - `variable_value` (text)
  - `variable_category` (text) - warranty, returns, shipping, quality, fees
  - `created_by_admin_id` (uuid)
  - `created_at`, `updated_at` (timestamptz)
  
  ### email_response_templates
  Product-specific email templates with variable syntax support
  - `id` (uuid, primary key)
  - `user_id` (uuid, references user_profiles) - merchant who owns this
  - `product_id` (uuid, references products) - ALWAYS product-specific
  - `template_name` (text) - e.g., "Return Instructions with WEN"
  - `template_category` (text) - order_status, return_request, delivery_exception, etc.
  - `thread_tags` (text array) - ['return', 'replacement', 'damaged']
  - `subject_line` (text) - with {{variable}} syntax
  - `body_text` (text) - with {{variable}} syntax
  - `usage_count` (integer DEFAULT 0)
  - `last_used_at` (timestamptz)
  - `is_active` (boolean DEFAULT true)
  - `display_order` (integer)
  - `created_at`, `updated_at` (timestamptz)
  
  ### template_usage_log
  Track template usage for analytics
  - `id` (uuid, primary key)
  - `user_id` (uuid, references user_profiles)
  - `template_id` (uuid, references email_response_templates)
  - `thread_id` (uuid, references chat_threads)
  - `order_id` (uuid, references shopify_orders)
  - `product_id` (uuid, references products)
  - `action_taken` (text) - 'copied', 'opened_email', 'previewed'
  - `used_at` (timestamptz DEFAULT now())
  
  ### thread_category_auto_messages
  Auto-messages sent when threads are created with specific tags
  - `id` (uuid, primary key)
  - `category_tag` (text) - return, replacement, damaged, defective, inquiry
  - `message_title` (text)
  - `message_body` (text) - markdown supported, with {{variable}} syntax
  - `is_active` (boolean DEFAULT true)
  - `display_order` (integer)
  - `created_at`, `updated_at` (timestamptz)
  
  ## Table Alterations
  
  ### chat_threads
  - Add `warehouse_entry_number` for return tracking
  
  ### shopify_orders
  - Add shipping address fields for email templates
  - Add status and fulfillment fields
  
  ### New: shopify_order_fulfillments
  Track shipments and tracking information
  - `id` (uuid, primary key)
  - `user_id` (uuid, references user_profiles)
  - `order_id` (uuid, references shopify_orders)
  - `shopify_order_id` (text)
  - `shopify_fulfillment_id` (text)
  - `tracking_number` (text)
  - `tracking_company` (text)
  - `tracking_url` (text)
  - `last_mile_tracking_number` (text)
  - `last_mile_carrier` (text)
  - `shipment_status` (text) - label_created, in_transit, delivered, exception, returned
  - `shipped_at` (timestamptz)
  - `delivered_at` (timestamptz)
  - `created_at`, `updated_at` (timestamptz)
  
  ## Security
  - Enable RLS on all new tables
  - Admins can manage all configurations
  - Merchants can view their own configurations and templates
  - Super admins can view all analytics
*/

-- =====================================================
-- 1. PRODUCT FACTORY CONFIGS
-- =====================================================

CREATE TABLE IF NOT EXISTS product_factory_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  factory_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  notes text,
  created_by_admin_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

CREATE INDEX IF NOT EXISTS idx_factory_configs_user ON product_factory_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_factory_configs_product ON product_factory_configs(product_id);

ALTER TABLE product_factory_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all factory configs"
  ON product_factory_configs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Merchants can view their factory configs"
  ON product_factory_configs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 2. PRODUCT LOGISTICS CONFIGS
-- =====================================================

CREATE TABLE IF NOT EXISTS product_logistics_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  contact_email text,
  contact_phone text,
  covers_lost_items boolean DEFAULT false,
  covers_damaged_items boolean DEFAULT false,
  covers_late_delivery boolean DEFAULT false,
  typical_delivery_days text DEFAULT '7-14 days',
  notes text,
  created_by_admin_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

CREATE INDEX IF NOT EXISTS idx_logistics_configs_user ON product_logistics_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_logistics_configs_product ON product_logistics_configs(product_id);

ALTER TABLE product_logistics_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all logistics configs"
  ON product_logistics_configs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Merchants can view their logistics configs"
  ON product_logistics_configs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 3. PRODUCT POLICY VARIABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS product_policy_variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variable_key text NOT NULL,
  variable_value text NOT NULL,
  variable_category text NOT NULL,
  created_by_admin_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, variable_key)
);

CREATE INDEX IF NOT EXISTS idx_policy_variables_user ON product_policy_variables(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_variables_product ON product_policy_variables(product_id);
CREATE INDEX IF NOT EXISTS idx_policy_variables_category ON product_policy_variables(variable_category);

ALTER TABLE product_policy_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all policy variables"
  ON product_policy_variables FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Merchants can view their policy variables"
  ON product_policy_variables FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 4. EMAIL RESPONSE TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS email_response_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  template_category text NOT NULL,
  thread_tags text[] DEFAULT '{}',
  subject_line text NOT NULL,
  body_text text NOT NULL,
  usage_count integer DEFAULT 0,
  last_used_at timestamptz,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_user ON email_response_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_product ON email_response_templates(product_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_response_templates(template_category);
CREATE INDEX IF NOT EXISTS idx_email_templates_tags ON email_response_templates USING GIN(thread_tags);

ALTER TABLE email_response_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all email templates"
  ON email_response_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Merchants can view and use their templates"
  ON email_response_templates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 5. TEMPLATE USAGE LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS template_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  template_id uuid REFERENCES email_response_templates(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES chat_threads(id) ON DELETE SET NULL,
  order_id uuid REFERENCES shopify_orders(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  action_taken text NOT NULL,
  used_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_usage_user ON template_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_template ON template_usage_log(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_date ON template_usage_log(used_at);

ALTER TABLE template_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log their own template usage"
  ON template_usage_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own usage logs"
  ON template_usage_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all usage logs"
  ON template_usage_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- =====================================================
-- 6. THREAD CATEGORY AUTO-MESSAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS thread_category_auto_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_tag text NOT NULL UNIQUE,
  message_title text NOT NULL,
  message_body text NOT NULL,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_messages_tag ON thread_category_auto_messages(category_tag);
CREATE INDEX IF NOT EXISTS idx_auto_messages_active ON thread_category_auto_messages(is_active);

ALTER TABLE thread_category_auto_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active auto-messages"
  ON thread_category_auto_messages FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins can manage auto-messages"
  ON thread_category_auto_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Insert default auto-messages for common categories
INSERT INTO thread_category_auto_messages (category_tag, message_title, message_body, display_order) VALUES
('return', 'Return Instructions', '**Important Return Instructions:**

Let us know the reason for the return. If the customer changed their mind, there will be a fee. If the reason for the return is our fault, we may cover the cost of the return.

**📋 Return Process:**

We will provide you a "Warehouse Entry Number" that you need to send to your customer first. Your customer will then need to clearly write this number on the outside of the package near the shipping label.

In addition to this, your customer will need to include a note inside the package with their:

• Full name
• Your order number
• Product name(s)
• Quantity (number of boxes, not individual units)

⚠️ **Important:** Returns sent without this information or to the wrong address may be rejected or discarded by the warehouse.

Items sent back to us without first requesting a return will not be accepted.', 1),

('replacement', 'Replacement Request Process', '**Replacement Request Process:**

To process a replacement, we''ll need:

• Clear photos showing the issue
• Order number and product name
• Description of the problem

Once approved, we''ll ship a replacement. Depending on the situation, we may ask you to have your customer return the defective item or dispose of it.

**Timeline:** Replacements typically ship within {{product_replacement_ship_time_days}}.', 2),

('damaged', 'Damaged Item Claim', '**Damaged Item Claim:**

For items damaged in transit:

• Take clear photos of the damaged item AND outer packaging
• Note the carrier and tracking number
• Submit claim within {{product_damage_claim_deadline_days}} of delivery

**Important:** Last-mile delivery carriers (USPS, Australia Post, Canada Post, etc.) are out of our control. Your customer will need to contact the carrier directly with their last-mile tracking number to file a claim.

We recommend your customer contact {{last_mile_carrier}} as soon as possible if items arrive damaged.', 3),

('defective', 'Defect Coverage', '**Defect Coverage:**

This product is covered for defects for {{product_defect_coverage_days}} days from delivery.

To process a defect claim, please provide:

• Clear photos or video showing the defect
• Description of what''s not working
• Date product was received

We''ll coordinate with the factory to assess and determine next steps (replacement, refund, or repair).

**Factory:** {{product_factory_name}}', 4),

('inquiry', 'Order Information', '**Order Information:**

I''m here to help! For fastest assistance, please let me know:

• Order number: {{order_number}}
• What information you need
• Any specific concerns

**Order Status:** {{fulfillment_status}}
{{#if tracking_number}}**Tracking:** {{tracking_number}}{{/if}}', 5)
ON CONFLICT (category_tag) DO NOTHING;

-- =====================================================
-- 7. ALTER EXISTING TABLES
-- =====================================================

-- Add WEN to chat_threads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_threads' AND column_name = 'warehouse_entry_number'
  ) THEN
    ALTER TABLE chat_threads ADD COLUMN warehouse_entry_number text;
  END IF;
END $$;

-- Add shipping and status fields to shopify_orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopify_orders' AND column_name = 'shipping_address_line1') THEN
    ALTER TABLE shopify_orders ADD COLUMN shipping_address_line1 text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopify_orders' AND column_name = 'shipping_address_line2') THEN
    ALTER TABLE shopify_orders ADD COLUMN shipping_address_line2 text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopify_orders' AND column_name = 'shipping_city') THEN
    ALTER TABLE shopify_orders ADD COLUMN shipping_city text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopify_orders' AND column_name = 'shipping_state') THEN
    ALTER TABLE shopify_orders ADD COLUMN shipping_state text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopify_orders' AND column_name = 'shipping_zip') THEN
    ALTER TABLE shopify_orders ADD COLUMN shipping_zip text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopify_orders' AND column_name = 'shipping_country') THEN
    ALTER TABLE shopify_orders ADD COLUMN shipping_country text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopify_orders' AND column_name = 'customer_phone') THEN
    ALTER TABLE shopify_orders ADD COLUMN customer_phone text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopify_orders' AND column_name = 'order_status_url') THEN
    ALTER TABLE shopify_orders ADD COLUMN order_status_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopify_orders' AND column_name = 'financial_status') THEN
    ALTER TABLE shopify_orders ADD COLUMN financial_status text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopify_orders' AND column_name = 'fulfillment_status') THEN
    ALTER TABLE shopify_orders ADD COLUMN fulfillment_status text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopify_orders' AND column_name = 'total_refunded') THEN
    ALTER TABLE shopify_orders ADD COLUMN total_refunded numeric DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- 8. SHOPIFY ORDER FULFILLMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS shopify_order_fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES shopify_orders(id) ON DELETE CASCADE,
  shopify_order_id text NOT NULL,
  shopify_fulfillment_id text,
  tracking_number text,
  tracking_company text,
  tracking_url text,
  last_mile_tracking_number text,
  last_mile_carrier text,
  shipment_status text DEFAULT 'label_created',
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fulfillments_user ON shopify_order_fulfillments(user_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_order ON shopify_order_fulfillments(order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_shopify_order ON shopify_order_fulfillments(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_tracking ON shopify_order_fulfillments(tracking_number);

ALTER TABLE shopify_order_fulfillments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their fulfillments"
  ON shopify_order_fulfillments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all fulfillments"
  ON shopify_order_fulfillments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert fulfillments"
  ON shopify_order_fulfillments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "System can update fulfillments"
  ON shopify_order_fulfillments FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- =====================================================
-- 9. UPDATE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_factory_configs_updated_at ON product_factory_configs;
CREATE TRIGGER update_factory_configs_updated_at
  BEFORE UPDATE ON product_factory_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_logistics_configs_updated_at ON product_logistics_configs;
CREATE TRIGGER update_logistics_configs_updated_at
  BEFORE UPDATE ON product_logistics_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_policy_variables_updated_at ON product_policy_variables;
CREATE TRIGGER update_policy_variables_updated_at
  BEFORE UPDATE ON product_policy_variables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_response_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_response_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_auto_messages_updated_at ON thread_category_auto_messages;
CREATE TRIGGER update_auto_messages_updated_at
  BEFORE UPDATE ON thread_category_auto_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fulfillments_updated_at ON shopify_order_fulfillments;
CREATE TRIGGER update_fulfillments_updated_at
  BEFORE UPDATE ON shopify_order_fulfillments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();