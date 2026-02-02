/*
  # Add Subscription Notification Types
  
  1. New Notification Types
    - `subscription_alert` - Category for all subscription notifications
    - `trial_ending` - Sent 7 days before trial ends
    - `tier_limit_warning` - Sent at 80% usage
    - `tier_limit_urgent` - Sent at 95% usage  
    - `tier_upgraded` - Subscription upgraded
    - `tier_cancelled` - Subscription cancelled
  
  2. Changes
    - Add constraint to notifications.type column to include subscription types
    - Ensures data integrity for notification system
    
  3. Security
    - No changes to RLS policies
*/

-- Add constraint for notification types including subscription alerts
DO $$
BEGIN
  -- First, check if constraint already exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notifications_type_check'
    AND table_name = 'notifications'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;
  
  -- Add the updated constraint with subscription types
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      -- Existing types (if any were previously constrained)
      'order_issue',
      'payment_reminder',
      'system_alert',
      'message_received',
      'order_update',
      'quote_update',
      
      -- New subscription notification types
      'subscription_alert',
      'trial_ending',
      'tier_limit_warning',
      'tier_limit_urgent',
      'tier_upgraded',
      'tier_cancelled'
    ));
END $$;