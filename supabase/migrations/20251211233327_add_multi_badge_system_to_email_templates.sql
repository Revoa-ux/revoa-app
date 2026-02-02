/*
  # Add Multi-Badge System to Email Templates

  1. New Columns
    - `badges` (text[]) - Array of contextual badges for intelligent filtering
    - `order_status_hints` (text[]) - Order statuses this template is relevant for
    - `action_required` (text) - Optional action flag (e.g., "need_confirm", "need_reason")

  2. Badge Categories
    **Order State Badges:**
    - "Not Shipped" - Order hasn't left warehouse
    - "Shipped" - In transit
    - "Out for Delivery" - Final mile delivery
    - "Delivered" - Confirmed delivery
    - "Returned to Sender" - Package bounced back
    
    **Action Required Badges:**
    - "Need Confirm" - Waiting for customer confirmation
    - "Need Reason" - Need more info from customer
    - "Need WEN" - Need Warehouse Entry Number
    - "Notify Supplier" - Supplier action required
    
    **Context/Flag Badges:**
    - "Took Upsell" - Customer accepted upsell
    - "Invalid Address" - Address issue detected
    - "Chargeback" - Dispute filed
    - "Delivery Exception" - Carrier issue
    - "Address Issue" - Address needs correction
    - "Partial Refund" - Partial refund scenario
    - "Full Refund" - Full refund scenario
    - "Warranty Issue" - Warranty-related
    - "Expedited" - Rush/expedited handling

  3. Changes
    - Add new columns for intelligent badge system
    - Update existing templates with appropriate badges
*/

-- Add new columns
ALTER TABLE email_templates
ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS order_status_hints TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS action_required TEXT;

-- Add index for badge filtering
CREATE INDEX IF NOT EXISTS idx_email_templates_badges ON email_templates USING GIN(badges);
CREATE INDEX IF NOT EXISTS idx_email_templates_order_status ON email_templates USING GIN(order_status_hints);

-- Update existing templates with intelligent badges

-- Replacement Templates
UPDATE email_templates SET
  badges = ARRAY['Warranty Issue', 'Need Reason'],
  order_status_hints = ARRAY['shipped', 'delivered'],
  action_required = 'need_reason'
WHERE name = 'Standard Replacement Request';

UPDATE email_templates SET
  badges = ARRAY['Not Shipped'],
  order_status_hints = ARRAY['pending', 'not_shipped']
WHERE name = 'Replacement Approved';

-- Damaged Items
UPDATE email_templates SET
  badges = ARRAY['Warranty Issue', 'Need Reason', 'Delivered'],
  order_status_hints = ARRAY['delivered'],
  action_required = 'need_reason'
WHERE name = 'Damaged Item Report';

-- Returns
UPDATE email_templates SET
  badges = ARRAY['Need Confirm'],
  order_status_hints = ARRAY['shipped', 'delivered'],
  action_required = 'need_confirm'
WHERE name = 'Return Instructions';

-- Defective Products
UPDATE email_templates SET
  badges = ARRAY['Warranty Issue', 'Need Reason', 'Delivered'],
  order_status_hints = ARRAY['delivered'],
  action_required = 'need_reason'
WHERE name = 'Defective Product Report';

-- Shipping Updates
UPDATE email_templates SET
  badges = ARRAY['Shipped'],
  order_status_hints = ARRAY['shipped', 'in_transit']
WHERE name = 'Shipment Confirmation';

UPDATE email_templates SET
  badges = ARRAY['Not Shipped'],
  order_status_hints = ARRAY['pending', 'not_shipped']
WHERE name = 'Delayed Shipment Notification';

-- Order Confirmation
UPDATE email_templates SET
  badges = ARRAY['Not Shipped'],
  order_status_hints = ARRAY['pending', 'not_shipped']
WHERE name = 'Order Received Confirmation';

-- Quote Follow-up
UPDATE email_templates SET
  badges = ARRAY['Follow Up'],
  order_status_hints = ARRAY[]::TEXT[]
WHERE name = 'Quote Follow-up';

-- General Inquiry
UPDATE email_templates SET
  badges = ARRAY['Need Reason'],
  order_status_hints = ARRAY[]::TEXT[],
  action_required = 'need_reason'
WHERE name = 'General Response';

-- Thank You
UPDATE email_templates SET
  badges = ARRAY['Delivered'],
  order_status_hints = ARRAY['delivered']
WHERE name = 'Thank You for Your Order';