/*
  # Add Shipping Timeframes and Fulfillment Tracking

  This migration adds automated package delay detection capabilities.

  ## Changes to `product_quotes` table
  - Add `shipping_timeframe_min` (integer) - Minimum business days for delivery (default: 4)
  - Add `shipping_timeframe_max` (integer) - Maximum business days for delivery (default: 7)
  - These fields allow admins to set expected delivery timeframes when processing quotes

  ## Changes to `shopify_orders` table
  - Add `fulfillment_created_at` (timestamptz) - When Shopify fulfillment was created
  - Add `fulfillment_updated_at` (timestamptz) - Last update to fulfillment status
  - Add `tracking_company` (text) - Carrier name (e.g., "USPS", "FedEx", "UPS")
  - Add `expected_delivery_date` (date) - Calculated delivery date based on fulfillment + timeframe

  ## Why These Fields?
  - Enables automatic detection of delayed packages
  - Powers intelligent customer service flows
  - Allows proactive communication before customers reach out
  - Provides data for delivery performance analytics
*/

-- Add shipping timeframe fields to product_quotes
ALTER TABLE product_quotes
ADD COLUMN IF NOT EXISTS shipping_timeframe_min integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS shipping_timeframe_max integer DEFAULT 7;

-- Add fulfillment tracking fields to shopify_orders
ALTER TABLE shopify_orders
ADD COLUMN IF NOT EXISTS fulfillment_created_at timestamptz,
ADD COLUMN IF NOT EXISTS fulfillment_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS tracking_company text,
ADD COLUMN IF NOT EXISTS expected_delivery_date date;

-- Add comment explaining the business days calculation
COMMENT ON COLUMN product_quotes.shipping_timeframe_min IS 'Minimum business days for delivery (excludes weekends and holidays)';
COMMENT ON COLUMN product_quotes.shipping_timeframe_max IS 'Maximum business days for delivery (excludes weekends and holidays)';
COMMENT ON COLUMN shopify_orders.expected_delivery_date IS 'Calculated delivery date: fulfillment_created_at + shipping_timeframe_max business days';

-- Create index for querying potentially delayed orders
CREATE INDEX IF NOT EXISTS idx_shopify_orders_expected_delivery 
ON shopify_orders(expected_delivery_date) 
WHERE fulfillment_status = 'fulfilled' AND expected_delivery_date IS NOT NULL;