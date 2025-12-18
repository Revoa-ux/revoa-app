/*
  # Fix Completion Messages Across All Flows

  ## Changes
  - Updates all completion node messages to actively point to template buttons
  - Changes passive "Use the templates" to active "Click a template below"
  - Maintains consistent, helpful tone across all flows

  ## Flows Updated
  - Defective Product Flow
  - Cancel/Modify Order Flow
  - Wrong Item Flow
  - Missing Items Flow
  - Refund Request Flow
  - Replacement Flow
*/

-- Update Defective Product Flow completion
UPDATE bot_flows
SET
  flow_definition = jsonb_set(
    flow_definition,
    '{nodes}',
    (
      SELECT jsonb_agg(
        CASE 
          WHEN node->>'id' = 'defective_completion' THEN
            jsonb_set(node, '{content}', '"Perfect! Click a template below to communicate with your customer:"')
          ELSE node
        END
      )
      FROM jsonb_array_elements(flow_definition->'nodes') AS node
    )
  ),
  version = version + 1,
  updated_at = now()
WHERE category = 'defective' AND name = 'Defective Product Handler';

-- Update Cancel/Modify Order Flow completion
UPDATE bot_flows
SET
  flow_definition = jsonb_set(
    flow_definition,
    '{nodes}',
    (
      SELECT jsonb_agg(
        CASE 
          WHEN node->>'id' = 'cancel_completion' THEN
            jsonb_set(node, '{content}', '"All set! Click a template below to confirm with your customer:"')
          ELSE node
        END
      )
      FROM jsonb_array_elements(flow_definition->'nodes') AS node
    )
  ),
  version = version + 1,
  updated_at = now()
WHERE category = 'cancel_modify' AND name = 'Cancel/Modify Order Handler';

-- Update Wrong Item Flow completion
UPDATE bot_flows
SET
  flow_definition = jsonb_set(
    flow_definition,
    '{nodes}',
    (
      SELECT jsonb_agg(
        CASE 
          WHEN node->>'id' = 'wrong_completion' THEN
            jsonb_set(node, '{content}', '"Done! Click a template below to send the resolution details:"')
          ELSE node
        END
      )
      FROM jsonb_array_elements(flow_definition->'nodes') AS node
    )
  ),
  version = version + 1,
  updated_at = now()
WHERE category = 'wrong_item' AND name = 'Wrong Item Handler';

-- Update Missing Items Flow completion
UPDATE bot_flows
SET
  flow_definition = jsonb_set(
    flow_definition,
    '{nodes}',
    (
      SELECT jsonb_agg(
        CASE 
          WHEN node->>'id' = 'missing_completion' THEN
            jsonb_set(node, '{content}', '"Ready! Click a template below to update your customer:"')
          ELSE node
        END
      )
      FROM jsonb_array_elements(flow_definition->'nodes') AS node
    )
  ),
  version = version + 1,
  updated_at = now()
WHERE category = 'missing_items' AND name = 'Missing Items Handler';

-- Update Refund Request Flow completion
UPDATE bot_flows
SET
  flow_definition = jsonb_set(
    flow_definition,
    '{nodes}',
    (
      SELECT jsonb_agg(
        CASE 
          WHEN node->>'id' = 'refund_completion' THEN
            jsonb_set(node, '{content}', '"All done! Click a template below to notify your customer:"')
          ELSE node
        END
      )
      FROM jsonb_array_elements(flow_definition->'nodes') AS node
    )
  ),
  version = version + 1,
  updated_at = now()
WHERE category = 'refund' AND name = 'Refund Request Handler';

-- Update Replacement Flow completion
UPDATE bot_flows
SET
  flow_definition = jsonb_set(
    flow_definition,
    '{nodes}',
    (
      SELECT jsonb_agg(
        CASE 
          WHEN node->>'id' = 'replacement_completion' THEN
            jsonb_set(node, '{content}', '"Perfect! Click a template below to send replacement details:"')
          ELSE node
        END
      )
      FROM jsonb_array_elements(flow_definition->'nodes') AS node
    )
  ),
  version = version + 1,
  updated_at = now()
WHERE category = 'replacement' AND name = 'Replacement Request Handler';
