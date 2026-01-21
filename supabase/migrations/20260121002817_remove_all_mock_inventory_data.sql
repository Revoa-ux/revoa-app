/*
  # Remove All Mock Inventory Data

  1. Purpose
    - Delete all mock inventory products created for screenshots
    - Clean database back to production state

  2. Products Deleted
    - LED Desk Lamp (all variants)
    - Memory Foam Pillow (all variants)
    - Travel Backpack 40L (all variants)
*/

-- Delete all mock inventory products
DELETE FROM products
WHERE name IN (
  'LED Desk Lamp',
  'Memory Foam Pillow',
  'Travel Backpack 40L',
  'Wireless Bluetooth Headphones',
  'Stainless Steel Water Bottle',
  'Yoga Mat Premium',
  'Portable Phone Charger 20000mAh',
  'Cotton T-Shirt - Black',
  'Running Shoes - Sport Edition',
  'Smart Coffee Maker',
  'Wireless Mouse Ergonomic',
  'Stainless Steel Frying Pan'
);