/*
  # Duplicate Mock Inventory for All Users

  1. Purpose
    - Ensure all users can see the mock warehouse inventory data
    - Creates copies of existing mock products for each user in the system

  2. Approach
    - Finds all users who exist in auth.users
    - For each user, creates duplicate products with all the same metadata
    - Makes SKUs unique by appending a suffix based on user index
    - Skips users who already have products

  3. Notes
    - This is for demo/testing purposes only
    - In production, products would be created per user organically
*/

DO $$
DECLARE
  user_record RECORD;
  product_record RECORD;
  user_index INTEGER := 0;
BEGIN
  -- Loop through each user who doesn't have products yet
  -- Only include users that exist in auth.users (to satisfy foreign key)
  FOR user_record IN 
    SELECT DISTINCT up.id 
    FROM user_profiles up
    INNER JOIN auth.users au ON au.id = up.id
    WHERE up.id NOT IN (SELECT DISTINCT created_by FROM products WHERE created_by IS NOT NULL)
  LOOP
    
    user_index := user_index + 1;
    
    -- For each user, copy all products from the reference user (alan@revoa.app)
    FOR product_record IN 
      SELECT * FROM products 
      WHERE created_by = 'b9698d61-0110-4e19-b3dd-88378256f25a'::uuid
    LOOP
      
      -- Insert duplicate product for this user with unique external_id
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
        user_record.id,  -- Assign to this user
        jsonb_set(
          product_record.metadata, 
          '{sku}', 
          to_jsonb(product_record.external_id || '-U' || user_index)
        ),  -- Update SKU in metadata to match external_id
        product_record.supplier_id,
        product_record.source,
        product_record.supplier_price,
        product_record.recommended_retail_price,
        product_record.external_id || '-U' || user_index,  -- Make unique per user
        product_record.cogs_cost,
        product_record.pending_order_quantity,
        product_record.created_at
      );
      
    END LOOP;
    
  END LOOP;
END $$;