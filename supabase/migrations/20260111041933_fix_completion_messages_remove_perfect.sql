/*
  # Fix Flow Completion Messages

  1. Changes
    - Updates all completion node messages in bot_flows to remove the out-of-context "Perfect!" prefix
    - Changes messages to be more neutral and contextually appropriate
    - Uses "Great!" or direct instructions instead

  2. Affected Flows
    - All bot_flows with completion nodes containing "Perfect!" in their content
*/

-- Update completion messages for Return flow
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'return_completion' AND node->>'type' = 'completion' THEN
          jsonb_set(node, '{content}', '"Generate the WEN and provide return instructions to the customer. Use the email template below to communicate next steps."')
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Return Request Handler';

-- Update completion messages for Damage flow
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'type' = 'completion' AND node->>'content' LIKE 'Perfect!%' THEN
          jsonb_set(node, '{content}', to_jsonb(
            regexp_replace(node->>'content', '^Perfect!\s*', '', 'i')
          ))
        WHEN node->>'type' = 'info' AND node->>'content' LIKE 'Perfect!%' THEN
          jsonb_set(node, '{content}', to_jsonb(
            regexp_replace(node->>'content', '^Perfect!\s*', '', 'i')
          ))
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE is_active = true;

-- Update Shipping flow completion
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'shipping_completion' AND node->>'type' = 'completion' THEN
          jsonb_set(node, '{content}', '"Click a template below to draft your customer email:"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Shipping Issue Handler';

-- Update Defective flow completion
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'defective_completion' AND node->>'type' = 'completion' THEN
          jsonb_set(node, '{content}', '"Click a template below to communicate with your customer:"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Defective Product Handler';

-- Update Replacement flow completion
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'replacement_completion' AND node->>'type' = 'completion' THEN
          jsonb_set(node, '{content}', '"Click a template below to send replacement details:"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Replacement Request Handler';

-- Update Cancel/Modify flow completion  
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'cancel_completion' AND node->>'type' = 'completion' THEN
          jsonb_set(node, '{content}', '"Use the email template to confirm the changes with your customer."')
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Cancel/Modify Order Handler';

-- Update Pre-Shipment flows  
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'type' IN ('completion', 'info') AND node->>'content' LIKE 'Perfect!%' THEN
          jsonb_set(node, '{content}', to_jsonb(
            regexp_replace(node->>'content', '^Perfect!\s*', '', 'i')
          ))
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE category LIKE 'pre_ship%' AND is_active = true;