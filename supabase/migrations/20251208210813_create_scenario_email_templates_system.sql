/*
  # Scenario-Based Email Template System

  1. New Tables
    - `email_templates`
      - `id` (uuid, primary key)
      - `name` (text) - Display name like "Standard Replacement Request"
      - `category` (text) - Scenario type: replacement, damaged, return, defective, shipping, confirmation, quote_followup, inquiry, thankyou
      - `subject_line` (text) - Email subject with variable support
      - `body_html` (text) - HTML email body with variable placeholders
      - `body_plain` (text) - Plain text version
      - `is_active` (boolean) - Enable/disable templates
      - `sort_order` (integer) - Display order within category
      - `usage_count` (integer) - Track popularity
      - `last_used_at` (timestamptz) - Last usage timestamp
      - Timestamps
    
    - `email_template_sends`
      - Track when users send templated emails to customers
      - Links to chat threads for context
  
  2. Security
    - Enable RLS on all tables
    - Users can read templates
    - System tracks template usage
  
  3. Supported Variables
    - Customer: {{customer_first_name}}, {{customer_last_name}}, {{customer_email}}
    - Order: {{order_number}}, {{order_date}}, {{order_items}}, {{order_total}}, {{tracking_number}}
    - Quote: {{product_name}}, {{warranty_days}}, {{warranty_expiry_date}}, {{covers_damaged}}, {{covers_lost}}
    - Shipping: {{shipping_address}}, {{estimated_delivery}}
    - System: {{merchant_name}}, {{current_date}}
*/

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'replacement',
    'damaged', 
    'return',
    'defective',
    'shipping',
    'confirmation',
    'quote_followup',
    'inquiry',
    'thankyou'
  )),
  subject_line TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_plain TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Template Usage Tracking
CREATE TABLE IF NOT EXISTS email_template_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  chat_thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  populated_subject TEXT NOT NULL,
  populated_body TEXT NOT NULL,
  copied_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_email_template_sends_user ON email_template_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_email_template_sends_thread ON email_template_sends(chat_thread_id);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_sends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates
CREATE POLICY "Anyone can view active templates"
  ON email_templates FOR SELECT
  USING (is_active = true);

-- RLS Policies for email_template_sends
CREATE POLICY "Users can view own template sends"
  ON email_template_sends FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own template sends"
  ON email_template_sends FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_templates
  SET 
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE id = template_uuid;
END;
$$;
