/*
  # Add Inventory for tyler.jtw@gmail.com (Correct Auth ID)

  1. Purpose
    - Create mock inventory products for tyler.jtw@gmail.com
    - Uses the correct auth.users ID

  2. Approach
    - Use the auth.users ID: ac9319e0-e8ad-470b-b1fd-1c7914d234fd
    - Copy products from reference user with unique SKUs
*/

DO $$
DECLARE
  target_user_id uuid := 'ac9319e0-e8ad-470b-b1fd-1c7914d234fd'::uuid;
  product_record RECORD;
BEGIN
  -- Check if user already has products, skip if they do
  IF NOT EXISTS (SELECT 1 FROM products WHERE created_by = target_user_id) THEN
    
    -- Copy all products from the reference user
    FOR product_record IN 
      SELECT * FROM products 
      WHERE created_by = 'b9698d61-0110-4e19-b3dd-88378256f25a'::uuid
    LOOP
      
      -- Insert duplicate product with unique external_id
      INSERT INTO products (
        name,
        description,
        category,
        approval_status,
        created_by,
        metadata,
        supplier_id,
        source,
        supplier_price,
        recommended_retail_price,
        external_id,
        cogs_cost,
        pending_order_quantity,
        created_at
      ) VALUES (
        product_record.name,
        product_record.description,
        product_record.category,
        product_record.approval_status,
        target_user_id,
        jsonb_set(
          product_record.metadata, 
          '{sku}', 
          to_jsonb(product_record.external_id || '-TJW')
        ),
        product_record.supplier_id,
        product_record.source,
        product_record.supplier_price,
        product_record.recommended_retail_price,
        product_record.external_id || '-TJW',
        product_record.cogs_cost,
        product_record.pending_order_quantity,
        product_record.created_at
      );
      
    END LOOP;
    
  END IF;
END $$;