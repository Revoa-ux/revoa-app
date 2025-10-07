/*
  # Add foreign key for products.created_by
  
  1. Changes
    - Add foreign key constraint from products.created_by to user_profiles.user_id
    - This enables Supabase to understand the relationship for joins
  
  2. Security
    - No changes to RLS policies
*/

-- Add foreign key if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_created_by_fkey' 
    AND table_name = 'products'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT products_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES user_profiles(user_id)
    ON DELETE SET NULL;
  END IF;
END $$;
