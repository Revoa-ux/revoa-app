/*
  # Update Completion Messages - UX Friendly

  1. Changes
    - Changes "a template" to "the" since there's only one template shown
    - Uses more direct language like "Send the customer this email:"
    - More conversational and actionable

  2. Affected Flows
    - All flows with completion messages
*/

-- Update Defective Product Handler
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'defective_completion' THEN
          jsonb_set(node, '{content}', '"Got it! Send the customer this email:"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Defective Product Handler' AND is_active = true;

-- Update Replacement Request Handler
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'replacement_completion' THEN
          jsonb_set(node, '{content}', '"All set! Send the customer this email:"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Replacement Request Handler' AND is_active = true;

-- Update Missing Items Handler
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'missing_completion' THEN
          jsonb_set(node, '{content}', '"Ready! Send the customer this email:"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Missing Items Handler' AND is_active = true;

-- Update Refund Request Handler
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'refund_completion' THEN
          jsonb_set(node, '{content}', '"All done! Send the customer this email:"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Refund Request Handler' AND is_active = true;

-- Update Wrong Item Handler
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'wrong_completion' THEN
          jsonb_set(node, '{content}', '"Done! Send the customer this email:"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Wrong Item Handler' AND is_active = true;

-- Update Cancel/Modify Order Handler
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'cancel_completion' THEN
          jsonb_set(node, '{content}', '"Got it! Send the customer this email:"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Cancel/Modify Order Handler' AND is_active = true;

-- Update Shipping Issue Handler
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'not_updating_less_7_completion' THEN
          jsonb_set(node, '{content}', '"Got it! Send the customer this email:"')
        WHEN node->>'id' = 'not_updating_7_plus_completion' THEN
          jsonb_set(node, '{content}', '"Understood! Send the customer this email:"')
        WHEN node->>'id' = 'not_updating_delivered_completion' THEN
          jsonb_set(node, '{content}', '"Okay! Send the customer this email:"')
        WHEN node->>'id' = 'lost_14_days_completion' THEN
          jsonb_set(node, '{content}', '"Got it! Send the customer this email:"')
        WHEN node->>'id' = 'lost_returned_completion' THEN
          jsonb_set(node, '{content}', '"Understood! Send the customer this email:"')
        WHEN node->>'id' = 'lost_delivered_not_received_completion' THEN
          jsonb_set(node, '{content}', '"Okay! Send the customer this email:"')
        WHEN node->>'id' = 'failed_address_completion' THEN
          jsonb_set(node, '{content}', '"Got it! Send the customer this email:"')
        WHEN node->>'id' = 'failed_no_access_completion' THEN
          jsonb_set(node, '{content}', '"Understood! Send the customer this email:"')
        WHEN node->>'id' = 'failed_held_completion' THEN
          jsonb_set(node, '{content}', '"Got it! Send the customer this email:"')
        WHEN node->>'id' = 'delay_analysis_complete' THEN
          jsonb_set(node, '{content}', '"Analysis complete! Send the customer this email:"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Shipping Issue Handler' AND is_active = true;

-- Update Return Request Handler
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'return_completion' THEN
          jsonb_set(node, '{content}', '"All set! Send the customer this email with return instructions:"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Return Request Handler' AND is_active = true;