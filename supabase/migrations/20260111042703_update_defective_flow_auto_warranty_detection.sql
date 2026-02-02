/*
  # Update Defective Flow with Auto Warranty Detection

  1. Changes
    - Replaces manual warranty question with automatic warranty detection
    - Uses dynamicContent to fetch warranty info from the quote/product data
    - Shows warranty status automatically based on order data
    - Merchant no longer needs to manually check warranty period

  2. How It Works
    - System checks the product_quotes table for warranty_days
    - Compares order date to current date
    - Automatically determines if within coverage
    - Displays warranty info and proceeds accordingly
*/

UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'defective_intro' THEN
          jsonb_set(
            jsonb_set(node, '{content}', '"I''ll help you handle this defective product claim. Let me check the warranty coverage for this order."'),
            '{nextNodeId}', '"defective_warranty_check"'
          )
        WHEN node->>'id' = 'defective_within_warranty' THEN
          jsonb_build_object(
            'id', 'defective_warranty_check',
            'type', 'info',
            'content', 'Checking warranty coverage...',
            'nextNodeId', 'defective_gather_info',
            'metadata', jsonb_build_object(
              'dynamicContent', true,
              'contentSource', 'product_warranty',
              'autoAdvance', false
            )
          )
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Defective Product Handler' AND is_active = true;