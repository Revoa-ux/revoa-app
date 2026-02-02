/*
  # Add Line Item Reference to Chat Threads

  ## Changes
  - Add `line_item_id` to `chat_threads` to track which specific product the thread is about
  - This is crucial for multi-product orders where warranty/coverage varies by product
  - Allows flows to pull product-specific warranty data

  ## Why
  - Orders can have multiple products with different warranty periods
  - Threads need to reference the specific product being discussed
  - Enables accurate warranty calculation per product
*/

-- Add line_item_id column to chat_threads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_threads' AND column_name = 'line_item_id'
  ) THEN
    ALTER TABLE chat_threads ADD COLUMN line_item_id uuid REFERENCES order_line_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_chat_threads_line_item_id ON chat_threads(line_item_id);

-- Add comment
COMMENT ON COLUMN chat_threads.line_item_id IS 'Specific product/line item this thread is about (for multi-product orders)';