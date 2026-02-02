/*
  # Cleanup Warehouse Inventory - Keep Only 3 Products

  1. Purpose
    - Remove excess mock products from warehouse inventory
    - Keep only: Memory Foam Pillow, Travel Backpack 40L, and LED Desk Lamp

  2. Products Removed
    - Wireless Bluetooth Headphones
    - Stainless Steel Water Bottle
    - Yoga Mat Premium
    - Portable Phone Charger 20000mAh
    - Cotton T-Shirt - Black
    - Running Shoes - Sport Edition
    - Smart Coffee Maker
    - Wireless Mouse Ergonomic
    - Stainless Steel Frying Pan

  3. Products Kept
    - Memory Foam Pillow (MFP-STD)
    - Travel Backpack 40L (TBP-40L-GRY)
    - LED Desk Lamp (LDL-220)
*/

-- Delete all mock products except the three we want to keep
DELETE FROM products
WHERE external_id IN (
  'WBH-001',       -- Wireless Bluetooth Headphones
  'SSWB-500',      -- Stainless Steel Water Bottle
  'YMP-183',       -- Yoga Mat Premium
  'PPC-20K',       -- Portable Phone Charger 20000mAh
  'CTS-BLK-M',     -- Cotton T-Shirt - Black
  'RS-SPORT-42',   -- Running Shoes - Sport Edition
  'SCM-12CUP',     -- Smart Coffee Maker
  'WME-2.4G',      -- Wireless Mouse Ergonomic
  'SSFP-12IN'      -- Stainless Steel Frying Pan
);