/*
  # Add Escalation Metadata to Defective and Cancel/Modify Flows

  ## Changes
  Updates the defective and cancel/modify flows to include escalation metadata
  on completion nodes that require agent action.

  ## Escalation Points
  
  ### Defective Flow
  - Outside warranty → factory_exception_approval
  - Contact factory for claim → contact_factory_claim
  
  ### Cancel/Modify Flow
  - Already shipped (address change) → contact_carrier_intercept
  - Address change before shipped → contact_logistics_redirect
*/

-- Update Defective Flow
UPDATE bot_flows
SET
  flow_definition = jsonb_set(
    jsonb_set(
      flow_definition,
      '{nodes}',
      (
        SELECT jsonb_agg(
          CASE
            -- Add escalation to defective_out_of_warranty node
            WHEN node->>'id' = 'defective_out_of_warranty' THEN
              jsonb_set(
                node,
                '{metadata}',
                COALESCE((node->'metadata')::jsonb, '{}'::jsonb) || jsonb_build_object(
                  'requiresAgentAction', true,
                  'escalationType', 'factory_exception_approval',
                  'escalationMessage', 'Your agent will review your out-of-warranty case for possible exception',
                  'adminActionMessage', 'Review out-of-warranty exception request'
                )
              )
            -- Add escalation to defective_contact_factory node
            WHEN node->>'id' = 'defective_contact_factory' THEN
              jsonb_set(
                node,
                '{metadata}',
                COALESCE((node->'metadata')::jsonb, '{}'::jsonb) || jsonb_build_object(
                  'requiresAgentAction', true,
                  'escalationType', 'contact_factory_claim',
                  'escalationMessage', 'Your agent will coordinate with the factory to resolve your defective item',
                  'adminActionMessage', 'Contact factory about defective product claim'
                )
              )
            ELSE node
          END
        )
        FROM jsonb_array_elements(flow_definition->'nodes') AS node
      )
    ),
    '{id}',
    '"defective_flow_v2_with_escalation"'
  ),
  version = 2,
  updated_at = now()
WHERE category = 'defective' AND name = 'Defective Product Handler';

-- Update Cancel/Modify Flow
UPDATE bot_flows
SET
  flow_definition = jsonb_set(
    jsonb_set(
      flow_definition,
      '{nodes}',
      (
        SELECT jsonb_agg(
          CASE
            -- Add escalation to cancel_already_shipped node
            WHEN node->>'id' = 'cancel_already_shipped' THEN
              jsonb_set(
                node,
                '{metadata}',
                COALESCE((node->'metadata')::jsonb, '{}'::jsonb) || jsonb_build_object(
                  'requiresAgentAction', true,
                  'escalationType', 'contact_carrier_intercept',
                  'escalationMessage', 'Your agent will contact the carrier to attempt interception or address change',
                  'adminActionMessage', 'Contact carrier to intercept/redirect already-shipped order'
                )
              )
            -- Add escalation to cancel_address_change node
            WHEN node->>'id' = 'cancel_address_change' THEN
              jsonb_set(
                node,
                '{metadata}',
                COALESCE((node->'metadata')::jsonb, '{}'::jsonb) || jsonb_build_object(
                  'requiresAgentAction', true,
                  'escalationType', 'contact_logistics_redirect',
                  'escalationMessage', 'Your agent will contact logistics to update the shipping address',
                  'adminActionMessage', 'Contact logistics/fulfillment to change shipping address'
                )
              )
            ELSE node
          END
        )
        FROM jsonb_array_elements(flow_definition->'nodes') AS node
      )
    ),
    '{id}',
    '"cancel_modify_flow_v2_with_escalation"'
  ),
  version = 2,
  updated_at = now()
WHERE category = 'cancel_modify' AND name = 'Cancel/Modify Order Handler';