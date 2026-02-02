/*
  # Remove Product Approval Notification System

  1. Changes
    - Drop product approval notification trigger
    - Delete existing product approval notifications
    - Keep notifications table but remove old product-related ones

  2. Notes
    - Product approval feature has been removed
    - Notifications table is kept for other notification types
*/

-- Drop the trigger for product approval notifications
DROP TRIGGER IF EXISTS notify_super_admins_new_product ON products;

-- Drop the function that creates product approval notifications
DROP FUNCTION IF EXISTS notify_super_admins_of_new_product();

-- Delete all existing product approval notifications
DELETE FROM notifications 
WHERE type = 'product_approval' 
   OR title LIKE '%Product Pending Approval%'
   OR title LIKE '%Product%Approval%';

-- Add comment
COMMENT ON TABLE notifications IS 'Stores user notifications for system events, not product approvals';
