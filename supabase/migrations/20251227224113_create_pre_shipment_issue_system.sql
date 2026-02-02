/*
  # Create Pre-Shipment Issue Detection and Resolution System

  ## Overview
  This migration creates a comprehensive system for detecting, tracking, and resolving
  order issues BEFORE shipment. This includes inventory shortages, quality issues,
  supplier delays, and more. The system automatically syncs with invoicing, quoting,
  and billing systems to ensure financial accuracy.

  ## New Tables

  ### 1. `pre_shipment_issues`
  Main table for tracking all pre-shipment order issues

  ### 2. `pre_shipment_resolutions`
  Tracks resolution actions and their impact on invoicing/quoting

  ### 3. `issue_notifications`
  Tracks all notifications sent about issues

  ### 4. `automated_issue_rules`
  Rules for automatic issue detection and resolution suggestions

  ## Modified Tables
  - `order_line_items`: Add issue tracking fields
  - `invoices`: Add adjustment tracking

  ## Security
  - RLS enabled on all tables
  - Users can view their own issues
  - Admins can manage issues for assigned users
  - Super admins can view all issues and configure rules
*/

-- Create pre_shipment_issues table
CREATE TABLE IF NOT EXISTS pre_shipment_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES shopify_orders(id) ON DELETE CASCADE,
  line_item_id uuid REFERENCES order_line_items(id) ON DELETE SET NULL,
  issue_type text NOT NULL CHECK (issue_type IN (
    'inventory_shortage',
    'quality_issue',
    'supplier_delay',
    'out_of_stock',
    'damage_detected',
    'variant_mismatch',
    'pricing_error',
    'shipping_restriction',
    'other'
  )),
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status text NOT NULL CHECK (status IN (
    'detected',
    'notified',
    'pending_customer',
    'pending_admin',
    'in_progress',
    'resolved',
    'cancelled'
  )) DEFAULT 'detected',
  description text NOT NULL,
  detected_at timestamptz DEFAULT now(),
  notified_at timestamptz,
  resolved_at timestamptz,
  resolution_type text CHECK (resolution_type IN (
    'substitution',
    'refund',
    'cancellation',
    'delay_accepted',
    'partial_fulfillment',
    'manual_resolution',
    'other'
  )),
  affected_quantity integer NOT NULL DEFAULT 1,
  original_sku text,
  original_product_name text,
  original_unit_price decimal(10, 2),
  original_unit_cost decimal(10, 2),
  metadata jsonb DEFAULT '{}'::jsonb,
  chat_thread_id uuid REFERENCES chat_threads(id) ON DELETE SET NULL,
  flow_session_id uuid REFERENCES thread_flow_sessions(id) ON DELETE SET NULL,
  detected_by text DEFAULT 'system',
  detected_by_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pre_shipment_resolutions table
CREATE TABLE IF NOT EXISTS pre_shipment_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES pre_shipment_issues(id) ON DELETE CASCADE,
  resolution_type text NOT NULL CHECK (resolution_type IN (
    'substitution',
    'refund',
    'cancellation',
    'delay',
    'partial_fulfillment',
    'manual_resolution'
  )),
  substitute_sku text,
  substitute_product_name text,
  substitute_line_item_id uuid REFERENCES order_line_items(id) ON DELETE SET NULL,
  substitute_unit_price decimal(10, 2),
  substitute_unit_cost decimal(10, 2),
  price_adjustment decimal(10, 2) DEFAULT 0,
  cost_adjustment decimal(10, 2) DEFAULT 0,
  shipping_adjustment decimal(10, 2) DEFAULT 0,
  total_adjustment decimal(10, 2) DEFAULT 0,
  refund_amount decimal(10, 2) DEFAULT 0,
  invoice_adjusted boolean DEFAULT false,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  invoice_adjustment_details jsonb,
  quote_adjusted boolean DEFAULT false,
  quote_id uuid REFERENCES product_quotes(id) ON DELETE SET NULL,
  quote_adjustment_details jsonb,
  customer_notified boolean DEFAULT false,
  customer_notified_at timestamptz,
  customer_approved boolean,
  customer_approved_at timestamptz,
  customer_response jsonb,
  admin_notes text,
  internal_notes text,
  resolved_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  auto_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create issue_notifications table
CREATE TABLE IF NOT EXISTS issue_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES pre_shipment_issues(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN (
    'email',
    'sms',
    'chat_message',
    'admin_alert',
    'flow_trigger'
  )),
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_type text NOT NULL CHECK (recipient_type IN ('customer', 'admin', 'super_admin')),
  subject text,
  content jsonb NOT NULL,
  template_used text,
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  response_received_at timestamptz,
  response_data jsonb,
  status text DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'acknowledged')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create automated_issue_rules table
CREATE TABLE IF NOT EXISTS automated_issue_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  description text,
  issue_type text NOT NULL,
  severity text CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_action text CHECK (auto_action IN (
    'notify_customer',
    'notify_admin',
    'start_flow',
    'auto_substitute',
    'auto_refund',
    'require_approval'
  )),
  suggested_resolution_type text,
  notification_template_id uuid,
  flow_category text,
  requires_approval boolean DEFAULT true,
  approval_threshold_amount decimal(10, 2),
  is_active boolean DEFAULT true,
  priority integer DEFAULT 100,
  created_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add fields to order_line_items for issue tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_line_items' AND column_name = 'has_pre_shipment_issue'
  ) THEN
    ALTER TABLE order_line_items ADD COLUMN has_pre_shipment_issue boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_line_items' AND column_name = 'issue_status'
  ) THEN
    ALTER TABLE order_line_items ADD COLUMN issue_status text CHECK (issue_status IN ('none', 'detected', 'resolved', 'cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_line_items' AND column_name = 'substituted_with_sku'
  ) THEN
    ALTER TABLE order_line_items ADD COLUMN substituted_with_sku text;
  END IF;
END $$;

-- Add fields to invoices for issue adjustment tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'has_adjustments'
  ) THEN
    ALTER TABLE invoices ADD COLUMN has_adjustments boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'adjustment_total'
  ) THEN
    ALTER TABLE invoices ADD COLUMN adjustment_total decimal(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'adjustment_details'
  ) THEN
    ALTER TABLE invoices ADD COLUMN adjustment_details jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pre_shipment_issues_user_id ON pre_shipment_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_pre_shipment_issues_order_id ON pre_shipment_issues(order_id);
CREATE INDEX IF NOT EXISTS idx_pre_shipment_issues_line_item_id ON pre_shipment_issues(line_item_id);
CREATE INDEX IF NOT EXISTS idx_pre_shipment_issues_status ON pre_shipment_issues(status) WHERE status != 'resolved';
CREATE INDEX IF NOT EXISTS idx_pre_shipment_issues_type_severity ON pre_shipment_issues(issue_type, severity);
CREATE INDEX IF NOT EXISTS idx_pre_shipment_issues_detected_at ON pre_shipment_issues(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_pre_shipment_issues_unresolved ON pre_shipment_issues(user_id, status) WHERE status IN ('detected', 'notified', 'pending_customer', 'pending_admin', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_pre_shipment_resolutions_issue_id ON pre_shipment_resolutions(issue_id);
CREATE INDEX IF NOT EXISTS idx_pre_shipment_resolutions_invoice_id ON pre_shipment_resolutions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pre_shipment_resolutions_quote_id ON pre_shipment_resolutions(quote_id);
CREATE INDEX IF NOT EXISTS idx_pre_shipment_resolutions_customer_approved ON pre_shipment_resolutions(customer_approved) WHERE customer_approved IS NULL;

CREATE INDEX IF NOT EXISTS idx_issue_notifications_issue_id ON issue_notifications(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_notifications_recipient_id ON issue_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_issue_notifications_status ON issue_notifications(status) WHERE status != 'delivered';

CREATE INDEX IF NOT EXISTS idx_automated_issue_rules_active ON automated_issue_rules(is_active, issue_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_automated_issue_rules_priority ON automated_issue_rules(priority DESC) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE pre_shipment_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_shipment_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_issue_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pre_shipment_issues
CREATE POLICY "Users can view own pre-shipment issues"
  ON pre_shipment_issues FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view assigned user issues"
  ON pre_shipment_issues FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_assignments ua
      WHERE ua.user_id = pre_shipment_issues.user_id AND ua.admin_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all issues"
  ON pre_shipment_issues FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "System can insert pre-shipment issues"
  ON pre_shipment_issues FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update assigned user issues"
  ON pre_shipment_issues FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_assignments ua
      WHERE ua.user_id = pre_shipment_issues.user_id AND ua.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Users can respond to own issues"
  ON pre_shipment_issues FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for pre_shipment_resolutions
CREATE POLICY "Users can view own resolutions"
  ON pre_shipment_resolutions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pre_shipment_issues psi
      WHERE psi.id = pre_shipment_resolutions.issue_id AND psi.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view assigned user resolutions"
  ON pre_shipment_resolutions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pre_shipment_issues psi
      JOIN user_assignments ua ON ua.user_id = psi.user_id
      WHERE psi.id = pre_shipment_resolutions.issue_id AND ua.admin_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage resolutions"
  ON pre_shipment_resolutions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Admins can insert resolutions"
  ON pre_shipment_resolutions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pre_shipment_issues psi
      JOIN user_assignments ua ON ua.user_id = psi.user_id
      WHERE psi.id = issue_id AND ua.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Admins can update resolutions"
  ON pre_shipment_resolutions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pre_shipment_issues psi
      JOIN user_assignments ua ON ua.user_id = psi.user_id
      WHERE psi.id = pre_shipment_resolutions.issue_id AND ua.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Users can approve resolutions"
  ON pre_shipment_resolutions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pre_shipment_issues psi
      WHERE psi.id = pre_shipment_resolutions.issue_id AND psi.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pre_shipment_issues psi
      WHERE psi.id = pre_shipment_resolutions.issue_id AND psi.user_id = auth.uid()
    )
  );

-- RLS Policies for issue_notifications
CREATE POLICY "Users can view own issue notifications"
  ON issue_notifications FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Admins can view assigned user notifications"
  ON issue_notifications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pre_shipment_issues psi
      JOIN user_assignments ua ON ua.user_id = psi.user_id
      WHERE psi.id = issue_notifications.issue_id AND ua.admin_id = auth.uid()
    )
  );

CREATE POLICY "System can insert notifications"
  ON issue_notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can acknowledge notifications"
  ON issue_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- RLS Policies for automated_issue_rules
CREATE POLICY "Anyone can view active rules"
  ON automated_issue_rules FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins can manage rules"
  ON automated_issue_rules FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pre_shipment_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_pre_shipment_issues_timestamp ON pre_shipment_issues;
CREATE TRIGGER update_pre_shipment_issues_timestamp
  BEFORE UPDATE ON pre_shipment_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_pre_shipment_updated_at();

DROP TRIGGER IF EXISTS update_pre_shipment_resolutions_timestamp ON pre_shipment_resolutions;
CREATE TRIGGER update_pre_shipment_resolutions_timestamp
  BEFORE UPDATE ON pre_shipment_resolutions
  FOR EACH ROW
  EXECUTE FUNCTION update_pre_shipment_updated_at();

DROP TRIGGER IF EXISTS update_automated_issue_rules_timestamp ON automated_issue_rules;
CREATE TRIGGER update_automated_issue_rules_timestamp
  BEFORE UPDATE ON automated_issue_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_pre_shipment_updated_at();

-- Function to automatically update line item issue status
CREATE OR REPLACE FUNCTION sync_line_item_issue_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.line_item_id IS NOT NULL THEN
    UPDATE order_line_items
    SET
      has_pre_shipment_issue = CASE
        WHEN NEW.status IN ('detected', 'notified', 'pending_customer', 'pending_admin', 'in_progress') THEN true
        ELSE false
      END,
      issue_status = CASE
        WHEN NEW.status = 'resolved' THEN 'resolved'
        WHEN NEW.status = 'cancelled' THEN 'cancelled'
        WHEN NEW.status IN ('detected', 'notified', 'pending_customer', 'pending_admin', 'in_progress') THEN 'detected'
        ELSE 'none'
      END
    WHERE id = NEW.line_item_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_line_item_issue_status ON pre_shipment_issues;
CREATE TRIGGER trigger_sync_line_item_issue_status
  AFTER INSERT OR UPDATE ON pre_shipment_issues
  FOR EACH ROW
  EXECUTE FUNCTION sync_line_item_issue_status();

-- Function to calculate total adjustment and sync with invoice
CREATE OR REPLACE FUNCTION sync_resolution_with_invoice()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issue pre_shipment_issues%ROWTYPE;
BEGIN
  NEW.total_adjustment := COALESCE(NEW.price_adjustment, 0) +
                          COALESCE(NEW.cost_adjustment, 0) +
                          COALESCE(NEW.shipping_adjustment, 0);

  SELECT * INTO v_issue FROM pre_shipment_issues WHERE id = NEW.issue_id;

  IF NEW.invoice_adjusted AND NEW.invoice_id IS NOT NULL THEN
    UPDATE invoices
    SET
      has_adjustments = true,
      adjustment_total = COALESCE(adjustment_total, 0) + NEW.total_adjustment,
      adjustment_details = COALESCE(adjustment_details, '[]'::jsonb) || jsonb_build_object(
        'resolution_id', NEW.id,
        'issue_id', NEW.issue_id,
        'type', NEW.resolution_type,
        'amount', NEW.total_adjustment,
        'refund', NEW.refund_amount,
        'adjusted_at', now(),
        'description', v_issue.description
      )::jsonb,
      total_amount = COALESCE(total_amount, amount) + NEW.total_adjustment - COALESCE(NEW.refund_amount, 0)
    WHERE id = NEW.invoice_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_resolution_with_invoice ON pre_shipment_resolutions;
CREATE TRIGGER trigger_sync_resolution_with_invoice
  BEFORE INSERT OR UPDATE ON pre_shipment_resolutions
  FOR EACH ROW
  EXECUTE FUNCTION sync_resolution_with_invoice();

-- Function to get unresolved issues count for a user
CREATE OR REPLACE FUNCTION get_unresolved_issues_count(p_user_id uuid)
RETURNS integer
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count
  FROM pre_shipment_issues
  WHERE user_id = p_user_id
  AND status IN ('detected', 'notified', 'pending_customer', 'pending_admin', 'in_progress');

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get issue summary for an order
CREATE OR REPLACE FUNCTION get_order_issue_summary(p_order_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_issues', COUNT(*),
    'resolved', COUNT(*) FILTER (WHERE status = 'resolved'),
    'pending', COUNT(*) FILTER (WHERE status IN ('detected', 'notified', 'pending_customer', 'pending_admin', 'in_progress')),
    'critical', COUNT(*) FILTER (WHERE severity = 'critical'),
    'has_unresolved_critical', EXISTS (
      SELECT 1 FROM pre_shipment_issues psi2
      WHERE psi2.order_id = p_order_id
      AND psi2.severity = 'critical'
      AND psi2.status NOT IN ('resolved', 'cancelled')
    )
  ) INTO v_summary
  FROM pre_shipment_issues
  WHERE order_id = p_order_id;

  RETURN v_summary;
END;
$$ LANGUAGE plpgsql;

-- Seed default automated issue rules
INSERT INTO automated_issue_rules (
  rule_name, description, issue_type, severity, conditions,
  auto_action, suggested_resolution_type, requires_approval,
  approval_threshold_amount, priority
) VALUES
  (
    'Critical Inventory Shortage',
    'Automatically notify admin and customer when inventory shortage is detected',
    'inventory_shortage', 'critical', '{"stock_level": 0}'::jsonb,
    'notify_customer', 'substitution', true, 100.00, 10
  ),
  (
    'Quality Issue Detected',
    'Start quality issue resolution flow',
    'quality_issue', 'high', '{}'::jsonb,
    'start_flow', 'substitution', true, NULL, 20
  ),
  (
    'Supplier Delay Notification',
    'Notify customer of supplier delays and offer options',
    'supplier_delay', 'medium', '{"delay_days": 3}'::jsonb,
    'notify_customer', 'delay', false, NULL, 30
  ),
  (
    'Out of Stock Auto-Substitute',
    'Automatically suggest substitutes for out of stock items',
    'out_of_stock', 'high', '{}'::jsonb,
    'auto_substitute', 'substitution', true, 50.00, 15
  )
ON CONFLICT DO NOTHING;
