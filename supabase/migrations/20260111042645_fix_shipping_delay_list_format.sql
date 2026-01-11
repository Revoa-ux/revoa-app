/*
  # Fix Shipping Delay Detection Message Format

  1. Changes
    - Updates the "Intelligent Delay Detection Active" message to display checkmark items as a proper vertical list
    - Each item appears on its own line for better readability

  2. Affected Flow
    - Shipping Issue Handler - shipping_delayed_intelligent node
*/

UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'shipping_delayed_intelligent' THEN
          jsonb_set(node, '{content}', '"**Intelligent Delay Detection Active** 🤖\n\nI''ll automatically analyze:\n\n• Fulfillment date from Shopify\n• Expected delivery (business days calculation)\n• Current delay status\n• Whether carrier contact is needed\n\nYou''ll get specific guidance based on the actual situation."')
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Shipping Issue Handler' AND is_active = true;