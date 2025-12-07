/*
  # Add Quote Policies and Shopify Domain
  
  1. Schema Changes
    - Add warranty and logistics coverage fields to product_quotes:
      - `warranty_days` (integer, nullable) - Number of days of warranty coverage from delivery
      - `covers_lost_items` (boolean, default false) - Logistics coverage for lost items in transit
      - `covers_damaged_items` (boolean, default false) - Logistics coverage for damaged items in transit
      - `covers_late_delivery` (boolean, default false) - Logistics coverage for late delivery
      - `shop_domain` (text, nullable) - Shopify store domain associated with this quote
    
  2. Purpose
    - Enable comprehensive product policy tracking
    - Store warranty information for customer support templates
    - Track logistics/shipping coverage guarantees
    - Associate quotes with specific Shopify store domains
    - Display complete quote details to users
  
  3. Security
    - Uses existing RLS policies (no changes needed)
    - New columns are fully accessible through existing policies
*/

-- Add warranty and coverage fields to product_quotes
ALTER TABLE product_quotes 
ADD COLUMN IF NOT EXISTS warranty_days integer,
ADD COLUMN IF NOT EXISTS covers_lost_items boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS covers_damaged_items boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS covers_late_delivery boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shop_domain text;

-- Create index for filtering quotes by shop domain
CREATE INDEX IF NOT EXISTS idx_product_quotes_shop_domain 
  ON product_quotes(shop_domain) 
  WHERE shop_domain IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN product_quotes.warranty_days IS 'Number of days of warranty coverage from delivery date';
COMMENT ON COLUMN product_quotes.covers_lost_items IS 'Whether logistics provider covers lost items in transit';
COMMENT ON COLUMN product_quotes.covers_damaged_items IS 'Whether logistics provider covers damaged items in transit';
COMMENT ON COLUMN product_quotes.covers_late_delivery IS 'Whether logistics provider covers late delivery';
COMMENT ON COLUMN product_quotes.shop_domain IS 'Shopify store domain associated with this quote (e.g., store.myshopify.com)';
