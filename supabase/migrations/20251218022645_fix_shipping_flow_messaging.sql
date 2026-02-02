/*
  # Fix Shipping Flow Messaging and Perspective

  ## Changes
  - Updates shipping flow to clarify bot role as 3PL/fulfillment assistant TO merchant
  - Fixes lost package guidance to clarify carrier claim responsibilities
  - Updates completion messages to actively point to template buttons
  - Improves all node messaging for clearer merchant guidance

  ## Key Fixes
  1. Intro now establishes bot as fulfillment assistant helping merchant
  2. Lost package node clarifies merchant (shipper) must file carrier claim
  3. Failed delivery node clarifies merchant provides info to customer
  4. Completion message actively points to template buttons below
  5. All nodes use "you" to address merchant directly
*/

-- Update the shipping flow with improved messaging
UPDATE bot_flows
SET
  flow_definition = '{
    "id": "shipping_flow_v1",
    "startNodeId": "shipping_intro",
    "nodes": [
      {
        "id": "shipping_intro",
        "type": "info",
        "content": "I''m your fulfillment assistant. Let''s diagnose this shipping issue and determine the best resolution for your customer.",
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
            "nodeId": "shipping_check_carrier"
          },
          {
            "conditions": [{"field": "shipping_issue_type", "operator": "equals", "value": "delayed"}],
            "nodeId": "shipping_delayed_info"
          },
          {
            "conditions": [{"field": "shipping_issue_type", "operator": "equals", "value": "lost"}],
            "nodeId": "shipping_lost_check"
          },
          {
            "conditions": [{"field": "shipping_issue_type", "operator": "equals", "value": "delivery_failed"}],
            "nodeId": "shipping_failed_info"
          }
        ]
      },
      {
        "id": "shipping_check_carrier",
        "type": "info",
        "content": "Check the carrier''s website directly - they often show more detailed tracking than Shopify. If tracking hasn''t updated in 7+ days, contact the carrier to investigate. You can reassure your customer that you''re monitoring the shipment.",
        "nextNodeId": "shipping_completion"
      },
      {
        "id": "shipping_delayed_info",
        "type": "info",
        "content": "Check the estimated delivery date. If it''s still within the normal delivery window, reassure your customer. If significantly delayed beyond the estimate, contact the carrier for an investigation and updated ETA to share with your customer.",
        "nextNodeId": "shipping_completion"
      },
      {
        "id": "shipping_lost_check",
        "type": "info",
        "content": "**Lost Package Protocol:**\n\n1. **File Carrier Claim** - As the shipper, you need to file a lost package claim with the carrier. Carriers will only work with you (the shipper), not the receiver. Wait until 14 days from ship date with no tracking updates before filing.\n\n2. **Send Replacement** - Send a replacement to your customer immediately. Don''t make them wait for the carrier claim to process (that can take weeks).\n\n3. **Carrier Reimbursement** - The carrier will reimburse you for the lost package cost once the claim is approved.",
        "nextNodeId": "shipping_completion"
      },
      {
        "id": "shipping_failed_info",
        "type": "info",
        "content": "The carrier attempted delivery but failed (customer not home, address issue, etc.). Provide your customer with:\n\n- Carrier contact info\n- Tracking number\n- Instructions to arrange redelivery or pickup\n\nThe customer will need to coordinate directly with the carrier to receive their package.",
        "nextNodeId": "shipping_completion"
      },
      {
        "id": "shipping_completion",
        "type": "completion",
        "content": "Perfect! Click a template below to draft your customer email:",
        "metadata": {
          "templateSuggestions": ["tracking_update", "delayed_package", "lost_package_replacement"]
        }
      }
    ]
  }'::jsonb,
  version = 2,
  updated_at = now()
WHERE category = 'shipping' AND name = 'Shipping Issue Handler';
