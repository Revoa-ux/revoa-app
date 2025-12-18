/*
  # Update Shipping Flow with Operational Guidance

  ## Changes
  - Rewrites shipping flow nodes with clear operational guidance for merchants
  - Focuses on INTERNAL actions merchants need to take (not customer-facing copy)
  - Removes redundant instructions that templates already cover
  - Completion node now uses template recommendation system instead of hardcoded IDs

  ## Key Updates
  1. Intro establishes context clearly
  2. Each scenario gives practical operational steps
  3. Clarifies shipper vs receiver responsibilities
  4. Completion message optimized for template preview cards
*/

UPDATE bot_flows
SET
  flow_definition = '{
    "id": "shipping_flow_v1",
    "startNodeId": "shipping_intro",
    "nodes": [
      {
        "id": "shipping_intro",
        "type": "info",
        "content": "I''ll help you diagnose this shipping issue and determine the best resolution.",
        "nextNodeId": "shipping_issue_type"
      },
      {
        "id": "shipping_issue_type",
        "type": "question",
        "content": "What''s the shipping issue?",
        "responseType": "single_choice",
        "options": [
          {"id": "not_updating", "label": "Tracking Not Updating", "value": "not_updating"},
          {"id": "delayed", "label": "Package Delayed", "value": "delayed"},
          {"id": "lost", "label": "Possibly Lost", "value": "lost"},
          {"id": "delivery_failed", "label": "Delivery Failed", "value": "delivery_failed"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "shipping_issue_type", "operator": "equals", "value": "not_updating"}],
            "nodeId": "shipping_not_updating_guidance"
          },
          {
            "conditions": [{"field": "shipping_issue_type", "operator": "equals", "value": "delayed"}],
            "nodeId": "shipping_delayed_guidance"
          },
          {
            "conditions": [{"field": "shipping_issue_type", "operator": "equals", "value": "lost"}],
            "nodeId": "shipping_lost_guidance"
          },
          {
            "conditions": [{"field": "shipping_issue_type", "operator": "equals", "value": "delivery_failed"}],
            "nodeId": "shipping_failed_guidance"
          }
        ]
      },
      {
        "id": "shipping_not_updating_guidance",
        "type": "info",
        "content": "**What to do:**\n\n1. Check the carrier''s tracking page directly (not Shopify) - they update faster and show more detail.\n\n2. If no updates for 7+ days, contact the carrier to open an investigation.\n\n3. Reassure your customer that you''re monitoring it.",
        "nextNodeId": "shipping_completion"
      },
      {
        "id": "shipping_delayed_guidance",
        "type": "info",
        "content": "**What to do:**\n\n1. Check the original estimated delivery date from the carrier.\n\n2. If still within the normal window, reassure customer it''s on track.\n\n3. If significantly past the estimate (3+ days), contact carrier for investigation and updated ETA.",
        "nextNodeId": "shipping_completion"
      },
      {
        "id": "shipping_lost_guidance",
        "type": "info",
        "content": "**Lost Package Protocol:**\n\n**Your actions (as shipper):**\n1. Wait 14 days from ship date with no tracking updates\n2. File lost package claim with carrier (they only work with shippers, not receivers)\n3. Send replacement to customer immediately - don''t make them wait for carrier claim\n\n**What happens next:**\n- Carrier processes claim (can take 2-4 weeks)\n- Carrier reimburses you for lost package cost once approved\n- Customer gets replacement right away",
        "nextNodeId": "shipping_completion"
      },
      {
        "id": "shipping_failed_guidance",
        "type": "info",
        "content": "**What happened:**\nCarrier attempted delivery but couldn''t complete it (customer not home, address issue, access problem, etc.).\n\n**Your action:**\nTell customer to contact the carrier directly with their tracking number to arrange redelivery or pickup.\n\n**Important:** For redelivery, carriers only work with the receiver (customer), not the sender (you). Customer must coordinate directly with carrier.",
        "nextNodeId": "shipping_completion"
      },
      {
        "id": "shipping_completion",
        "type": "completion",
        "content": "Great! Use one of these templates to send your customer a clear update:",
        "metadata": {}
      }
    ]
  }'::jsonb,
  version = 3,
  updated_at = now()
WHERE category = 'shipping' AND name = 'Shipping Issue Handler';
