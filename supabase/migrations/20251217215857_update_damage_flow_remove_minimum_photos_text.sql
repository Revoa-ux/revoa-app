/*
  # Remove Minimum Photos Text from Damage Flow

  ## Changes
  - Remove "minimum 2 photos required" text from upload node
  - Keep minFiles validation but remove user-facing text about it
*/

UPDATE bot_flows
SET
  flow_definition = jsonb_set(
    flow_definition,
    '{nodes}',
    (
      SELECT jsonb_agg(
        CASE 
          WHEN node->>'id' = 'damage_upload_photos' THEN
            jsonb_set(
              node,
              '{content}',
              '"📸 Upload the damage photos here:"'::jsonb
            )
          ELSE node
        END
      )
      FROM jsonb_array_elements(flow_definition->'nodes') AS node
    )
  ),
  version = 6,
  updated_at = now()
WHERE category = 'damage' AND name = 'Damage Report Handler';