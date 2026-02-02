/*
  # Fix Photo Upload Flows - Remove Emojis and Set minFiles to 1

  1. Changes
    - All three flows (Damage, Defective, Wrong Item) now require minimum 1 file (not 2)
    - Remove emojis from upload prompt messages
    - This ensures Submit Photos button appears after first upload

  2. Affected Flows
    - Damage Report Handler
    - Defective Product Handler  
    - Wrong Item Handler
*/

-- Update Damage Report Handler - fix minFiles and remove emoji
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'damage_upload_photos' THEN
          jsonb_set(
            jsonb_set(
              node,
              '{content}',
              '"Upload the damage photos here:"'::jsonb
            ),
            '{metadata,attachmentConfig,minFiles}',
            '1'::jsonb
          )
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Damage Report Handler' AND is_active = true;

-- Update Defective Product Handler - ensure minFiles is 1 and no emoji
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'defective_upload_evidence' THEN
          jsonb_set(
            jsonb_set(
              node,
              '{content}',
              '"Upload the defect photos/video here:"'::jsonb
            ),
            '{metadata,attachmentConfig,minFiles}',
            '1'::jsonb
          )
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Defective Product Handler' AND is_active = true;

-- Update Wrong Item Handler - ensure minFiles is 1 and no emoji
UPDATE bot_flows
SET flow_definition = jsonb_set(
  flow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'id' = 'wrong_upload_evidence' THEN
          jsonb_set(
            jsonb_set(
              node,
              '{content}',
              '"Upload the wrong item photos here:"'::jsonb
            ),
            '{metadata,attachmentConfig,minFiles}',
            '1'::jsonb
          )
        ELSE node
      END
    )
    FROM jsonb_array_elements(flow_definition->'nodes') AS node
  )
)
WHERE name = 'Wrong Item Handler' AND is_active = true;