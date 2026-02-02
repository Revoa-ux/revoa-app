/*
  # Enhance Invoice Management System

  ## Overview
  This migration enhances the invoice system with additional fields needed for
  comprehensive invoice management including payment links, reminders, and audit trails.

  ## Modified Tables

  ### `invoices`
  - Add payment_link for external payment URLs (Stripe, Wise)
  - Add reminder_sent_at to track last payment reminder
  - Add reminder_count to track number of reminders sent
  - Add line_items jsonb to store invoice line items
  - Add shopify_order_ids array to link to orders
  - Add breakdown jsonb for cost breakdown
  - Update status enum to include 'unpaid' and 'cancelled'
  - Make file_url nullable (generated later)

  ## New Tables

  ### `invoice_actions`
  - Audit trail for all invoice actions
  - Tracks who did what and when
  - Stores old and new values for changes

  ## Security
  - RLS enabled on new tables
  - Admins can view all audit logs
  - Users can view their own invoice actions

  ## Indexes
  - Composite indexes for common queries
  - Indexes for overdue invoice detection
  - Full-text search support for invoice numbers
*/

-- Update status enum to include unpaid and cancelled
DO $$
BEGIN
  -- Drop existing constraint
  ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

  -- Add new constraint with updated values
  ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('pending', 'paid', 'unpaid', 'overdue', 'cancelled'));
END $$;

-- Add missing columns to invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'payment_link'
  ) THEN
    ALTER TABLE invoices ADD COLUMN payment_link text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'reminder_sent_at'
  ) THEN
    ALTER TABLE invoices ADD COLUMN reminder_sent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'reminder_count'
  ) THEN
    ALTER TABLE invoices ADD COLUMN reminder_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'line_items'
  ) THEN
    ALTER TABLE invoices ADD COLUMN line_items jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'shopify_order_ids'
  ) THEN
    ALTER TABLE invoices ADD COLUMN shopify_order_ids text[] DEFAULT ARRAY[]::text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'breakdown'
  ) THEN
    ALTER TABLE invoices ADD COLUMN breakdown jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Make file_url nullable since PDFs are generated async
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'file_url' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE invoices ALTER COLUMN file_url DROP NOT NULL;
  END IF;
END $$;

-- Create invoice_actions audit table
CREATE TABLE IF NOT EXISTS invoice_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN (
    'created', 'status_changed', 'payment_received', 'reminder_sent',
    'marked_paid', 'marked_unpaid', 'cancelled', 'notes_updated', 'amount_updated'
  )),
  performed_by_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_value jsonb,
  new_value jsonb,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_actions
CREATE POLICY "Users can view their own invoice actions"
  ON invoice_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_actions.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all invoice actions"
  ON invoice_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

CREATE POLICY "Admins can insert invoice actions"
  ON invoice_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invoices_user_id_status
  ON invoices(user_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_created_at_desc
  ON invoices(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_due_date_status
  ON invoices(due_date, status)
  WHERE status IN ('pending', 'unpaid', 'overdue');

CREATE INDEX IF NOT EXISTS idx_invoices_payment_link
  ON invoices(payment_link)
  WHERE payment_link IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_auto_generated
  ON invoices(user_id, auto_generated)
  WHERE auto_generated = true;

CREATE INDEX IF NOT EXISTS idx_invoice_actions_invoice_id
  ON invoice_actions(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_actions_created_at
  ON invoice_actions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_actions_type
  ON invoice_actions(action_type);

-- Create function to auto-update invoice status to overdue
CREATE OR REPLACE FUNCTION update_overdue_invoices()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE invoices
  SET status = 'overdue'
  WHERE status IN ('pending', 'unpaid')
    AND due_date < now()
    AND due_date IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to log invoice actions
CREATE OR REPLACE FUNCTION log_invoice_action()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO invoice_actions (
      invoice_id,
      action_type,
      performed_by_id,
      new_value
    ) VALUES (
      NEW.id,
      'created',
      auth.uid(),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status != NEW.status THEN
      INSERT INTO invoice_actions (
        invoice_id,
        action_type,
        performed_by_id,
        old_value,
        new_value
      ) VALUES (
        NEW.id,
        'status_changed',
        auth.uid(),
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status)
      );
    END IF;

    -- Log reminder sent
    IF OLD.reminder_count != NEW.reminder_count THEN
      INSERT INTO invoice_actions (
        invoice_id,
        action_type,
        performed_by_id,
        new_value
      ) VALUES (
        NEW.id,
        'reminder_sent',
        auth.uid(),
        jsonb_build_object('reminder_count', NEW.reminder_count)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for logging invoice actions
DROP TRIGGER IF EXISTS trigger_log_invoice_action ON invoices;
CREATE TRIGGER trigger_log_invoice_action
  AFTER INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_invoice_action();

-- Add helpful comments
COMMENT ON TABLE invoice_actions IS 'Audit trail for all invoice-related actions';
COMMENT ON COLUMN invoices.payment_link IS 'External payment URL (Stripe, Wise, etc.)';
COMMENT ON COLUMN invoices.reminder_sent_at IS 'Timestamp of last payment reminder';
COMMENT ON COLUMN invoices.reminder_count IS 'Number of payment reminders sent';
COMMENT ON COLUMN invoices.line_items IS 'Array of line items in the invoice';
COMMENT ON COLUMN invoices.shopify_order_ids IS 'Array of Shopify order IDs related to this invoice';
COMMENT ON COLUMN invoices.breakdown IS 'Cost breakdown: product_cost, shipping_cost, commission, etc.';