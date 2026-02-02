/*
  # Enhance Analytics System with Metric Cards Metadata

  ## Overview
  Extends the analytics preferences system to support customizable metric cards,
  templates, and drag-and-drop layouts. This migration adds a metadata table
  for defining all available metric cards and their configurations.

  ## New Tables

  ### `metric_cards_metadata`
  Stores definitions of all available metric cards that users can add to their dashboards

  **Columns:**
  - `id` (text, primary key) - Unique identifier for the card (e.g., 'profit', 'revenue')
  - `category` (text) - Category: 'overview', 'revenue', 'expenses', 'inventory', 'ads', 'time', 'financial'
  - `title` (text) - Display title of the card
  - `description` (text) - Description of what the card shows
  - `icon` (text) - Icon identifier (lucide-react icon name)
  - `default_size` (text) - Default card size: 'small', 'medium', 'large'
  - `data_sources` (jsonb) - Array of data sources required: ['shopify', 'facebook', 'computed']
  - `calculation_type` (text) - How the metric is calculated: 'direct', 'computed', 'aggregated'
  - `available_in_templates` (jsonb) - Array of template IDs this card is available in
  - `default_visibility` (boolean) - Whether visible by default in templates
  - `sort_order` (integer) - Default sort order within category
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Modifications

  ### `user_analytics_preferences`
  - Add `visible_cards` (jsonb) - Array of card IDs currently visible
  - Add `card_positions` (jsonb) - Object mapping card IDs to their grid positions
  - Add `is_editing` (boolean) - Whether user is currently in edit mode

  ## Indexes
  - `idx_metric_cards_category` - Fast lookup by category
  - `idx_metric_cards_templates` - GIN index for template array searches

  ## Security
  - RLS enabled on metric_cards_metadata
  - Public read access for all authenticated users
  - Only admins can modify card definitions
*/

-- Create metric_cards_metadata table
CREATE TABLE IF NOT EXISTS metric_cards_metadata (
  id text PRIMARY KEY,
  category text NOT NULL,
  title text NOT NULL,
  description text,
  icon text NOT NULL,
  default_size text NOT NULL DEFAULT 'medium',
  data_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  calculation_type text NOT NULL DEFAULT 'direct',
  available_in_templates jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_visibility boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_metric_cards_category
  ON metric_cards_metadata(category);

CREATE INDEX IF NOT EXISTS idx_metric_cards_templates
  ON metric_cards_metadata USING GIN(available_in_templates);

CREATE INDEX IF NOT EXISTS idx_metric_cards_sort
  ON metric_cards_metadata(category, sort_order);

-- Enable RLS
ALTER TABLE metric_cards_metadata ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read metric card definitions
CREATE POLICY "Authenticated users can read metric cards"
  ON metric_cards_metadata
  FOR SELECT
  TO authenticated
  USING (true);

-- Add new columns to user_analytics_preferences
ALTER TABLE user_analytics_preferences
  ADD COLUMN IF NOT EXISTS visible_cards jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS card_positions jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_editing boolean DEFAULT false;

-- Insert default metric card definitions
INSERT INTO metric_cards_metadata (id, category, title, description, icon, default_size, data_sources, calculation_type, available_in_templates, default_visibility, sort_order)
VALUES
  -- Overview Cards
  ('profit', 'overview', 'Profit', 'Net profit after all expenses', 'TrendingUp', 'medium', '["shopify", "facebook", "computed"]', 'computed', '["executive", "financial"]', true, 1),
  ('revenue', 'overview', 'Total Revenue', 'Gross revenue from all sales', 'BarChart3', 'medium', '["shopify"]', 'direct', '["executive", "financial", "marketing"]', true, 2),
  ('orders', 'overview', 'Total Orders', 'Number of orders received', 'Package', 'medium', '["shopify"]', 'direct', '["executive", "inventory"]', true, 3),
  ('aov', 'overview', 'Average Order Value', 'Average value per order', 'DollarSign', 'medium', '["shopify"]', 'computed', '["executive", "financial", "marketing"]', true, 4),

  -- Revenue Cards
  ('net_revenue', 'revenue', 'Net Revenue', 'Revenue after returns', 'BarChart3', 'medium', '["shopify"]', 'computed', '["financial"]', true, 10),
  ('returns', 'revenue', 'Returns', 'Total returns amount and rate', 'RotateCcw', 'medium', '["shopify"]', 'direct', '["financial", "inventory"]', true, 11),
  ('number_of_orders', 'revenue', 'Number of Orders', 'Total order count', 'ShoppingCart', 'medium', '["shopify"]', 'direct', '["executive", "inventory"]', false, 12),

  -- Expense Cards
  ('cogs', 'expenses', 'Cost of Goods Sold', 'Total product costs', 'ShoppingCart', 'medium', '["shopify"]', 'direct', '["financial", "inventory"]', true, 20),
  ('ad_costs', 'expenses', 'Ad Spend', 'Total advertising spend', 'CreditCard', 'medium', '["facebook"]', 'direct', '["executive", "financial", "marketing"]', true, 21),
  ('transaction_fees', 'expenses', 'Transaction Fees', 'Payment processing fees', 'Receipt', 'medium', '["shopify"]', 'direct', '["financial"]', true, 22),
  ('refunds', 'expenses', 'Refunds', 'Total refunded amount', 'RotateCcw', 'medium', '["shopify"]', 'direct', '["financial"]', false, 23),
  ('chargebacks', 'expenses', 'Chargebacks', 'Total chargeback amount', 'AlertTriangle', 'medium', '["shopify"]', 'direct', '["financial"]', false, 24),

  -- Inventory Cards
  ('inventory_status', 'inventory', 'Inventory Status', 'Stock levels and fulfillment', 'Package', 'medium', '["shopify"]', 'direct', '["inventory"]', true, 30),
  ('fulfill', 'inventory', 'Orders to Fulfill', 'Pending fulfillment count', 'Clock', 'medium', '["shopify"]', 'computed', '["inventory"]', true, 31),
  ('order_metrics', 'inventory', 'Order Metrics', 'Units sold and orders', 'ShoppingCart', 'medium', '["shopify"]', 'computed', '["inventory"]', true, 32),
  ('time_metrics', 'inventory', 'Time Metrics', 'Fulfillment and delivery times', 'Clock', 'medium', '["shopify"]', 'computed', '["inventory"]', true, 33),
  ('financial_metrics', 'inventory', 'Financial Metrics', 'Revenue and margins', 'DollarSign', 'medium', '["shopify"]', 'computed', '["inventory", "financial"]', true, 34),

  -- Marketing/Ads Cards
  ('roas', 'ads', 'ROAS', 'Return on ad spend', 'TrendingUp', 'medium', '["shopify", "facebook", "computed"]', 'computed', '["marketing", "executive"]', true, 40),
  ('cpa', 'ads', 'Cost Per Acquisition', 'Average cost to acquire a customer', 'Target', 'medium', '["facebook", "computed"]', 'computed', '["marketing"]', true, 41),

  -- Financial Metrics
  ('avg_order_value', 'financial', 'Avg Order Value', 'Average order value', 'DollarSign', 'small', '["shopify"]', 'computed', '["financial"]', false, 50),
  ('aov_net_refunds', 'financial', 'AOV (Net Refunds)', 'AOV after refunds', 'DollarSign', 'small', '["shopify"]', 'computed', '["financial"]', false, 51),
  ('clv', 'financial', 'Customer Lifetime Value', 'Predicted lifetime value', 'TrendingUp', 'small', '["shopify"]', 'computed', '["financial", "marketing"]', false, 52),
  ('purchase_frequency', 'financial', 'Purchase Frequency', 'Average purchases per customer', 'RefreshCw', 'small', '["shopify"]', 'computed', '["financial", "marketing"]', false, 53),
  ('ad_cost_per_order', 'financial', 'Ad Cost Per Order', 'Average ad cost per order', 'CreditCard', 'small', '["facebook", "shopify", "computed"]', 'computed', '["financial", "marketing"]', false, 54),
  ('roas_refunds_included', 'financial', 'ROAS (Refunds Included)', 'ROAS including refunds', 'TrendingUp', 'small', '["shopify", "facebook", "computed"]', 'computed', '["financial", "marketing"]', false, 55),
  ('break_even_roas', 'financial', 'Break-even ROAS', 'Minimum ROAS to break even', 'Target', 'small', '["computed"]', 'computed', '["financial", "marketing"]', false, 56),
  ('cac', 'financial', 'Customer Acquisition Cost', 'Cost to acquire new customer', 'UserPlus', 'small', '["facebook", "shopify", "computed"]', 'computed', '["financial", "marketing"]', false, 57),
  ('avg_cogs', 'financial', 'Average COGS', 'Average cost per item', 'ShoppingCart', 'small', '["shopify"]', 'computed', '["financial", "inventory"]', false, 58),
  ('gross_margin_percent', 'financial', 'Gross Margin %', 'Gross profit margin percentage', 'Percent', 'small', '["shopify", "computed"]', 'computed', '["financial"]', false, 59),
  ('profit_margin_percent', 'financial', 'Profit Margin %', 'Net profit margin percentage', 'Percent', 'small', '["shopify", "facebook", "computed"]', 'computed', '["financial", "executive"]', false, 60),
  ('return_rate', 'financial', 'Return Rate', 'Percentage of orders returned', 'RotateCcw', 'small', '["shopify"]', 'computed', '["financial", "inventory"]', false, 61),

  -- Balance Cards
  ('balance', 'balance', 'Current Balance', 'Available balance', 'Wallet', 'medium', '["balance"]', 'direct', '["executive", "financial"]', true, 70),
  ('projected', 'balance', 'Projected Orders', 'Future order projections', 'Calendar', 'medium', '["shopify", "computed"]', 'computed', '["inventory"]', false, 71)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  default_size = EXCLUDED.default_size,
  data_sources = EXCLUDED.data_sources,
  calculation_type = EXCLUDED.calculation_type,
  available_in_templates = EXCLUDED.available_in_templates,
  default_visibility = EXCLUDED.default_visibility,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Function to get default layout for a template
CREATE OR REPLACE FUNCTION get_default_template_layout(template_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'position', row_number() OVER (ORDER BY sort_order)
    )
  )
  INTO result
  FROM metric_cards_metadata
  WHERE template_name = ANY(
    SELECT jsonb_array_elements_text(available_in_templates)
  )
  AND default_visibility = true
  ORDER BY sort_order;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Function to initialize user preferences with default template
CREATE OR REPLACE FUNCTION initialize_user_analytics_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_cards jsonb;
BEGIN
  -- Get default cards for executive template
  SELECT jsonb_agg(id)
  INTO default_cards
  FROM metric_cards_metadata
  WHERE 'executive' = ANY(SELECT jsonb_array_elements_text(available_in_templates))
  AND default_visibility = true;

  -- Set visible cards if not already set
  IF NEW.visible_cards = '[]'::jsonb THEN
    NEW.visible_cards := COALESCE(default_cards, '[]'::jsonb);
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to initialize preferences
DROP TRIGGER IF EXISTS initialize_analytics_preferences_trigger ON user_analytics_preferences;
CREATE TRIGGER initialize_analytics_preferences_trigger
  BEFORE INSERT ON user_analytics_preferences
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_analytics_preferences();