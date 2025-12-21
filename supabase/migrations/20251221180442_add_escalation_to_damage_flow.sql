/*
  # Add Escalation Metadata to Damage Flow

  ## Changes
  Updates the damage flow to include escalation metadata on completion nodes
  that require agent action (contacting factory for review, claims, etc.)

  ## Escalation Points
  - Expired warranty manufacturing defect → contact_factory_claim
  - Unclear damage needing assessment → contact_factory_claim
*/

UPDATE bot_flows
SET
  flow_definition = jsonb_set(
    jsonb_set(
      flow_definition,
      '{nodes}',
      (
        SELECT jsonb_agg(
          CASE
            -- Add escalation to damage_warranty_expired_factory node
            WHEN node->>'id' = 'damage_warranty_expired_factory' THEN
              jsonb_set(
                node,
                '{metadata}',
                (node->'metadata')::jsonb || jsonb_build_object(
                  'requiresAgentAction', true,
                  'escalationType', 'contact_factory_claim',
                  'escalationMessage', 'Your agent will contact the factory to review your expired warranty case',
                  'adminActionMessage', 'Contact factory about expired warranty manufacturing defect'
                )
              )
            -- Add escalation to damage_factory_review node
            WHEN node->>'id' = 'damage_factory_review' THEN
              jsonb_set(
                node,
                '{metadata}',
                (node->'metadata')::jsonb || jsonb_build_object(
                  'requiresAgentAction', true,
                  'escalationType', 'contact_factory_claim',
                  'escalationMessage', 'Your agent will contact the factory for expert damage assessment',
                  'adminActionMessage', 'Contact factory for damage assessment - unclear damage type'
                )
              )
            ELSE node
          END
        )
        FROM jsonb_array_elements(flow_definition->'nodes') AS node
      )
    ),
    '{id}',
    '"damage_flow_v7_with_escalation"'
  ),
  version = 8,
  updated_at = now()
WHERE category = 'damage' AND name = 'Damage Report Handler';