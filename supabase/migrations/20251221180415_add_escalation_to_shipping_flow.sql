/*
  # Add Escalation Metadata to Shipping Flow

  ## Changes
  Updates the shipping flow to include escalation metadata on completion nodes
  that require agent action (contacting carriers, filing claims, etc.)

  ## Escalation Points
  - 7+ days no tracking → contact_carrier_investigation
  - Delivered 2+ days ago but not received → delivery_verification_needed
  - 14+ days lost package → file_carrier_claim
*/

UPDATE bot_flows
SET
  flow_definition = '{
    "id": "shipping_flow_v3",
    "startNodeId": "shipping_intro",
    "nodes": [
      {
        "id": "shipping_intro",
        "type": "info",
        "content": "I will help you diagnose this shipping issue and recommend the right response.",
        "nextNodeId": "shipping_issue_type"
      },
      {
        "id": "shipping_issue_type",
        "type": "question",
        "content": "What is the shipping issue?",
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
        "content": "**What to do:**\\n\\n1. Check the carrier''s tracking page directly (not Shopify) - they update faster and show more detail.\\n\\n2. If no updates for 7+ days, contact the carrier to open an investigation.\\n\\n3. Reassure your customer that you''re monitoring it.",
        "nextNodeId": "not_updating_duration"
      },
      {
        "id": "not_updating_duration",
        "type": "question",
        "content": "How long has tracking not updated?",
        "responseType": "single_choice",
        "options": [
          {"id": "less_than_7", "label": "Less than 7 days", "value": "less_than_7"},
          {"id": "7_plus_days", "label": "7+ days with no updates", "value": "7_plus_days"},
          {"id": "delivered_2_plus", "label": "Marked delivered 2+ days ago", "value": "delivered_2_plus"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "not_updating_duration", "operator": "equals", "value": "less_than_7"}],
            "nodeId": "not_updating_less_7_completion"
          },
          {
            "conditions": [{"field": "not_updating_duration", "operator": "equals", "value": "7_plus_days"}],
            "nodeId": "not_updating_7_plus_completion"
          },
          {
            "conditions": [{"field": "not_updating_duration", "operator": "equals", "value": "delivered_2_plus"}],
            "nodeId": "not_updating_delivered_completion"
          }
        ]
      },
      {
        "id": "not_updating_less_7_completion",
        "type": "completion",
        "content": "To provide tracking and reassurance:",
        "metadata": {
          "templateId": "order_status_shipped"
        }
      },
      {
        "id": "not_updating_7_plus_completion",
        "type": "completion",
        "content": "To explain the investigation process:",
        "metadata": {
          "templateId": "5dd91fc3-cb2d-48cc-8f4f-b80d874a918d",
          "requiresAgentAction": true,
          "escalationType": "contact_carrier_investigation",
          "escalationMessage": "Your agent will contact the carrier to investigate the tracking delay",
          "adminActionMessage": "Contact carrier about 7+ days no tracking"
        }
      },
      {
        "id": "not_updating_delivered_completion",
        "type": "completion",
        "content": "To help customer locate the package:",
        "metadata": {
          "templateId": "delivery_status_2_plus_days",
          "requiresAgentAction": true,
          "escalationType": "delivery_verification_needed",
          "escalationMessage": "Your agent will verify the delivery status and help locate the package",
          "adminActionMessage": "Verify delivery status - marked delivered but not received"
        }
      },
      {
        "id": "shipping_delayed_guidance",
        "type": "info",
        "content": "**What to do:**\\n\\n1. Check the original estimated delivery date from the carrier.\\n\\n2. If still within the normal window, reassure customer it''s on track.\\n\\n3. If significantly past the estimate (3+ days), contact carrier for investigation and updated ETA.",
        "nextNodeId": "delayed_customer_intent"
      },
      {
        "id": "delayed_customer_intent",
        "type": "question",
        "content": "What is the customer asking for?",
        "responseType": "single_choice",
        "options": [
          {"id": "just_update", "label": "Just wants an update", "value": "just_update"},
          {"id": "wants_refund", "label": "Wants a refund / complaining", "value": "wants_refund"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "delayed_customer_intent", "operator": "equals", "value": "just_update"}],
            "nodeId": "delayed_update_completion"
          },
          {
            "conditions": [{"field": "delayed_customer_intent", "operator": "equals", "value": "wants_refund"}],
            "nodeId": "delayed_refund_completion"
          }
        ]
      },
      {
        "id": "delayed_update_completion",
        "type": "completion",
        "content": "Based on the tracking status, send this reassurance:",
        "metadata": {
          "templateId": "5dd91fc3-cb2d-48cc-8f4f-b80d874a918d"
        }
      },
      {
        "id": "delayed_refund_completion",
        "type": "completion",
        "content": "For refund requests during delays, use this response:",
        "metadata": {
          "templateId": "shipping_complaint"
        }
      },
      {
        "id": "shipping_lost_guidance",
        "type": "info",
        "content": "**Lost Package Protocol:**\\n\\n**Your actions (as shipper):**\\n1. Wait 14 days from ship date with no tracking updates\\n2. File lost package claim with carrier (they only work with shippers, not receivers)\\n3. Send replacement to customer immediately - don''t make them wait for carrier claim\\n\\n**What happens next:**\\n- Carrier processes claim (can take 2-4 weeks)\\n- Carrier reimburses you for lost package cost once approved\\n- Customer gets replacement right away",
        "nextNodeId": "lost_package_status"
      },
      {
        "id": "lost_package_status",
        "type": "question",
        "content": "What is the package status?",
        "responseType": "single_choice",
        "options": [
          {"id": "no_updates_14", "label": "No tracking updates for 14+ days", "value": "no_updates_14"},
          {"id": "returned", "label": "Tracking shows returned to sender", "value": "returned"},
          {"id": "delivered_not_received", "label": "Marked delivered but customer didn''t receive", "value": "delivered_not_received"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "lost_package_status", "operator": "equals", "value": "no_updates_14"}],
            "nodeId": "lost_14_days_completion"
          },
          {
            "conditions": [{"field": "lost_package_status", "operator": "equals", "value": "returned"}],
            "nodeId": "lost_returned_completion"
          },
          {
            "conditions": [{"field": "lost_package_status", "operator": "equals", "value": "delivered_not_received"}],
            "nodeId": "lost_delivered_not_received_completion"
          }
        ]
      },
      {
        "id": "lost_14_days_completion",
        "type": "completion",
        "content": "Follow the lost package protocol:",
        "metadata": {
          "templateId": "lost_package_protocol",
          "requiresAgentAction": true,
          "escalationType": "file_carrier_claim",
          "escalationMessage": "Your agent will file a claim with the carrier for the lost package",
          "adminActionMessage": "File carrier claim for lost package (14+ days no updates)"
        }
      },
      {
        "id": "lost_returned_completion",
        "type": "completion",
        "content": "For packages returned to sender:",
        "metadata": {
          "templateId": "package_returned_warehouse"
        }
      },
      {
        "id": "lost_delivered_not_received_completion",
        "type": "completion",
        "content": "Help customer investigate delivery:",
        "metadata": {
          "templateId": "delivery_status_delivered_not_received",
          "requiresAgentAction": true,
          "escalationType": "delivery_verification_needed",
          "escalationMessage": "Your agent will investigate the delivery discrepancy",
          "adminActionMessage": "Investigate delivery - marked delivered but customer didn''t receive"
        }
      },
      {
        "id": "shipping_failed_guidance",
        "type": "info",
        "content": "**What happened:**\\nCarrier attempted delivery but couldn''t complete it (customer not home, address issue, access problem, etc.).\\n\\n**Your action:**\\nTell customer to contact the carrier directly with their tracking number to arrange redelivery or pickup.\\n\\n**Important:** For redelivery, carriers only work with the receiver (customer), not the sender (you). Customer must coordinate directly with carrier.",
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
  version = 4,
  updated_at = now()
WHERE category = 'shipping' AND name = 'Shipping Issue Handler';