/*
  # Seed Warehouse Inventory Mock Data

  1. Purpose
    - Add realistic mock product data to demonstrate the warehouse inventory tracker
    - Includes various inventory levels (in stock, low stock, out of stock)
    - Contains complete metadata for metrics calculation

  2. Mock Products Created
    - Wireless Bluetooth Headphones (Electronics)
    - Stainless Steel Water Bottle (Home & Kitchen)
    - Yoga Mat Premium (Sports & Outdoors)
    - LED Desk Lamp (Home & Kitchen)
    - Portable Phone Charger (Electronics)
    - Cotton T-Shirt (Apparel)
    - Running Shoes (Apparel)
    - Coffee Maker (Home & Kitchen)
    - Backpack Travel (Luggage & Bags)
    - Wireless Mouse (Electronics)
    - Frying Pan (Home & Kitchen)
    - Memory Foam Pillow (Home & Kitchen)

  3. Data Included
    - Product details (name, SKU, pricing, category)
    - Inventory levels (in stock, unfulfilled, fulfilled)
    - Performance metrics (fulfillment time, delivery time)
    - Financial data (costs, margins)
*/

-- Get the first user ID to assign products to
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  -- Get the first user from user_profiles
  SELECT id INTO first_user_id FROM user_profiles LIMIT 1;
  
  -- Only insert if we have a user
  IF first_user_id IS NOT NULL THEN
    
    -- Insert mock products with warehouse inventory data
    INSERT INTO products (
      id,
      name,
      category,
      external_id,
      cogs_cost,
      supplier_price,
      recommended_retail_price,
      created_by,
      approval_status,
      metadata,
      created_at
    ) VALUES
    (
      gen_random_uuid(),
      'Wireless Bluetooth Headphones',
      'Electronics',
      'WBH-001',
      35.00,
      35.00,
      79.99,
      first_user_id,
      'approved',
      jsonb_build_object(
        'sku', 'WBH-001',
        'quantity_available', 245,
        'quantity_sold', 127,
        'unfulfilled_quantity', 8,
        'avg_fulfillment_hours', 18,
        'avg_delivery_days', 3.2,
        'shipping_cost', 5.50,
        'image_url', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'
      ),
      NOW() - INTERVAL '45 days'
    ),
    (
      gen_random_uuid(),
      'Stainless Steel Water Bottle',
      'Home & Kitchen',
      'SSWB-500',
      8.50,
      8.50,
      24.99,
      first_user_id,
      'approved',
      jsonb_build_object(
        'sku', 'SSWB-500',
        'quantity_available', 412,
        'quantity_sold', 289,
        'unfulfilled_quantity', 12,
        'avg_fulfillment_hours', 14,
        'avg_delivery_days', 2.8,
        'shipping_cost', 4.25,
        'image_url', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400'
      ),
      NOW() - INTERVAL '60 days'
    ),
    (
      gen_random_uuid(),
      'Yoga Mat Premium',
      'Sports & Outdoors',
      'YMP-183',
      12.00,
      12.00,
      39.99,
      first_user_id,
      'approved',
      jsonb_build_object(
        'sku', 'YMP-183',
        'quantity_available', 87,
        'quantity_sold', 156,
        'unfulfilled_quantity', 5,
        'avg_fulfillment_hours', 22,
        'avg_delivery_days', 4.1,
        'shipping_cost', 6.75,
        'image_url', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400'
      ),
      NOW() - INTERVAL '38 days'
    ),
    (
      gen_random_uuid(),
      'LED Desk Lamp',
      'Home & Kitchen',
      'LDL-220',
      18.00,
      18.00,
      49.99,
      first_user_id,
      'approved',
      jsonb_build_object(
        'sku', 'LDL-220',
        'quantity_available', 156,
        'quantity_sold', 93,
        'unfulfilled_quantity', 3,
        'avg_fulfillment_hours', 16,
        'avg_delivery_days', 3.5,
        'shipping_cost', 7.20,
        'image_url', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400'
      ),
      NOW() - INTERVAL '52 days'
    ),
    (
      gen_random_uuid(),
      'Portable Phone Charger 20000mAh',
      'Electronics',
      'PPC-20K',
      22.00,
      22.00,
      59.99,
      first_user_id,
      'approved',
      jsonb_build_object(
        'sku', 'PPC-20K',
        'quantity_available', 334,
        'quantity_sold', 412,
        'unfulfilled_quantity', 18,
        'avg_fulfillment_hours', 12,
        'avg_delivery_days', 2.5,
        'shipping_cost', 4.80,
        'image_url', 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400'
      ),
      NOW() - INTERVAL '70 days'
    ),
    (
      gen_random_uuid(),
      'Cotton T-Shirt - Black',
      'Apparel',
      'CTS-BLK-M',
      6.50,
      6.50,
      19.99,
      first_user_id,
      'approved',
      jsonb_build_object(
        'sku', 'CTS-BLK-M',
        'quantity_available', 523,
        'quantity_sold', 678,
        'unfulfilled_quantity', 25,
        'avg_fulfillment_hours', 20,
        'avg_delivery_days', 3.8,
        'shipping_cost', 3.50,
        'image_url', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'
      ),
      NOW() - INTERVAL '85 days'
    ),
    (
      gen_random_uuid(),
      'Running Shoes - Sport Edition',
      'Apparel',
      'RS-SPORT-42',
      28.00,
      28.00,
      89.99,
      first_user_id,
      'approved',
      jsonb_build_object(
        'sku', 'RS-SPORT-42',
        'quantity_available', 64,
        'quantity_sold', 145,
        'unfulfilled_quantity', 7,
        'avg_fulfillment_hours', 24,
        'avg_delivery_days', 4.5,
        'shipping_cost', 8.50,
        'image_url', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'
      ),
      NOW() - INTERVAL '42 days'
    ),
    (
      gen_random_uuid(),
      'Smart Coffee Maker',
      'Home & Kitchen',
      'SCM-12CUP',
      45.00,
      45.00,
      129.99,
      first_user_id,
      'approved',
      jsonb_build_object(
        'sku', 'SCM-12CUP',
        'quantity_available', 0,
        'quantity_sold', 89,
        'unfulfilled_quantity', 15,
        'avg_fulfillment_hours', 28,
        'avg_delivery_days', 5.2,
        'shipping_cost', 12.00,
        'image_url', 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400'
      ),
      NOW() - INTERVAL '28 days'
    ),
    (
      gen_random_uuid(),
      'Travel Backpack 40L',
      'Luggage & Bags',
      'TBP-40L-GRY',
      32.00,
      32.00,
      79.99,
      first_user_id,
      'approved',
      jsonb_build_object(
        'sku', 'TBP-40L-GRY',
        'quantity_available', 178,
        'quantity_sold', 234,
        'unfulfilled_quantity', 9,
        'avg_fulfillment_hours', 19,
        'avg_delivery_days', 3.9,
        'shipping_cost', 9.25,
        'image_url', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400'
      ),
      NOW() - INTERVAL '55 days'
    ),
    (
      gen_random_uuid(),
      'Wireless Mouse Ergonomic',
      'Electronics',
      'WME-2.4G',
      15.00,
      15.00,
      34.99,
      first_user_id,
      'approved',
      jsonb_build_object(
        'sku', 'WME-2.4G',
        'quantity_available', 298,
        'quantity_sold', 456,
        'unfulfilled_quantity', 11,
        'avg_fulfillment_hours', 15,
        'avg_delivery_days', 2.9,
        'shipping_cost', 3.75,
        'image_url', 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400'
      ),
      NOW() - INTERVAL '68 days'
    ),
    (
      gen_random_uuid(),
      'Stainless Steel Frying Pan',
      'Home & Kitchen',
      'SSFP-12IN',
      24.00,
      24.00,
      59.99,
      first_user_id,
      'approved',
      jsonb_build_object(
        'sku', 'SSFP-12IN',
        'quantity_available', 143,
        'quantity_sold', 187,
        'unfulfilled_quantity', 6,
        'avg_fulfillment_hours', 21,
        'avg_delivery_days', 4.3,
        'shipping_cost', 8.80,
        'image_url', 'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=400'
      ),
      NOW() - INTERVAL '48 days'
    ),
    (
      gen_random_uuid(),
      'Memory Foam Pillow',
      'Home & Kitchen',
      'MFP-STD',
      16.00,
      16.00,
      39.99,
      first_user_id,
      'approved',
      jsonb_build_object(
        'sku', 'MFP-STD',
        'quantity_available', 267,
        'quantity_sold', 312,
        'unfulfilled_quantity', 14,
        'avg_fulfillment_hours', 17,
        'avg_delivery_days', 3.6,
        'shipping_cost', 6.50,
        'image_url', 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400'
      ),
      NOW() - INTERVAL '63 days'
    );
    
  END IF;
END $$;