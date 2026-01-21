/*
  # Delete All Products Except Three

  1. Purpose
    - Remove all mock products except LED Desk Lamp, Memory Foam Pillow, and Travel Backpack 40L
    - Clean up duplicates across all users

  2. Products Kept
    - LED Desk Lamp (all variants)
    - Memory Foam Pillow (all variants)
    - Travel Backpack 40L (all variants)

  3. Products Deleted
    - All other products including their variants
*/

-- Delete all products that are NOT one of the three we want to keep
DELETE FROM products
WHERE name NOT IN (
  'LED Desk Lamp',
  'Memory Foam Pillow',
  'Travel Backpack 40L'
);