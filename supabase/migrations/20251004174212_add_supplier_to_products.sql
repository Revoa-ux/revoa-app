/*
  # Add Supplier Reference to Products

  1. Changes
    - Add supplier_id column to products table
    - Add foreign key constraint to suppliers table
    - Create index for faster queries
    - Update existing products to use the first supplier (if any)

  2. Security
    - Maintain existing RLS policies
*/

-- Add supplier_id column to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE products ADD COLUMN supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

-- Update existing products to use the first supplier if one exists
DO $$
DECLARE
  first_supplier_id uuid;
BEGIN
  SELECT id INTO first_supplier_id FROM suppliers LIMIT 1;
  
  IF first_supplier_id IS NOT NULL THEN
    UPDATE products
    SET supplier_id = first_supplier_id
    WHERE supplier_id IS NULL;
  END IF;
END $$;

-- Add helpful comment
COMMENT ON COLUMN products.supplier_id IS 'References the supplier who provides this product';
