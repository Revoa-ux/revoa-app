/*
  # Intelligent Template Selection with Decision Trees

  ## Overview
  Complete redesign of shipping flow with decision trees that gather context
  through clarifying questions, then show exactly ONE perfect template match.

  ## Changes
  1. **Shipping Flow Decision Trees**
     - Delayed package: asks customer intent (update vs refund)
     - Delivery failed: asks specific reason (address, access, etc.)
     - Lost package: asks current status (no updates, returned, delivered not received)
     - Not updating: asks duration (< 7 days, 7+ days, delivered 2+ days ago)

  2. **Scenario-Specific Completion Nodes**
     - Each decision path leads to ONE specific completion node
     - Each completion node maps to ONE specific template
     - Completion messages are contextual and informational (not celebratory)

  3. **Template Mapping**
     - Explicit template IDs in completion node metadata
     - No more fuzzy scoring or "top 3" recommendations
     - Direct deterministic mapping based on flow state

  ## Template ID Mappings
  - Order Status Follow-Up: 5dd91fc3-cb2d-48cc-8f4f-b80d874a918d
  - Shipping Complaint: TBD (need to create)
  - Invalid Address Exception: TBD
  - No Access Exception: TBD
  - No Such Number Exception: TBD
  - Carrier Payment Hold: TBD
  - Lost Package Protocol: TBD
  - Package Returned to Warehouse: TBD
  - Delivery Status Delivered Not Received: TBD
  - Order Status Shipped: TBD
*/

-- Update shipping flow with complete decision tree structure
UPDATE bot_flows
SET
  flow_definition = '{
    "id": "shipping_flow_v2",
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
          "templateId": "5dd91fc3-cb2d-48cc-8f4f-b80d874a918d"
        }
      },
      {
        "id": "not_updating_delivered_completion",
        "type": "completion",
        "content": "To help customer locate the package:",
        "metadata": {
          "templateId": "delivery_status_2_plus_days"
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
        "content": "To explain the lost package protocol:",
        "metadata": {
          "templateId": "lost_package_protocol"
        }
      },
      {
        "id": "lost_returned_completion",
        "type": "completion",
        "content": "To offer immediate reshipment:",
        "metadata": {
          "templateId": "package_returned_to_warehouse"
        }
      },
      {
        "id": "lost_delivered_not_received_completion",
        "type": "completion",
        "content": "To help customer locate the package:",
        "metadata": {
          "templateId": "delivery_status_delivered_not_received"
        }
      },
      {
        "id": "shipping_failed_guidance",
        "type": "info",
        "content": "**What happened:**\\nCarrier attempted delivery but couldn''t complete it (customer not home, address issue, access problem, etc.).\\n\\n**Your action:**\\nTell customer to contact the carrier directly with their tracking number to arrange redelivery or pickup.\\n\\n**Important:** For redelivery, carriers only work with the receiver (customer), not the sender (you). Customer must coordinate directly with carrier.",
        "nextNodeId": "failed_specific_reason"
      },
      {
        "id": "failed_specific_reason",
        "type": "question",
        "content": "What does the tracking show?",
        "responseType": "single_choice",
        "options": [
          {"id": "not_home", "label": "Customer not home / attempted delivery", "value": "not_home"},
          {"id": "invalid_address", "label": "Invalid address", "value": "invalid_address"},
          {"id": "no_access", "label": "No access to location", "value": "no_access"},
          {"id": "no_such_number", "label": "Address number doesn''t exist", "value": "no_such_number"},
          {"id": "payment_hold", "label": "Carrier payment hold", "value": "payment_hold"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "failed_specific_reason", "operator": "equals", "value": "not_home"}],
            "nodeId": "failed_general_completion"
          },
          {
            "conditions": [{"field": "failed_specific_reason", "operator": "equals", "value": "invalid_address"}],
            "nodeId": "failed_invalid_address_completion"
          },
          {
            "conditions": [{"field": "failed_specific_reason", "operator": "equals", "value": "no_access"}],
            "nodeId": "failed_no_access_completion"
          },
          {
            "conditions": [{"field": "failed_specific_reason", "operator": "equals", "value": "no_such_number"}],
            "nodeId": "failed_no_such_number_completion"
          },
          {
            "conditions": [{"field": "failed_specific_reason", "operator": "equals", "value": "payment_hold"}],
            "nodeId": "failed_payment_hold_completion"
          }
        ]
      },
      {
        "id": "failed_general_completion",
        "type": "completion",
        "content": "To help customer arrange redelivery:",
        "metadata": {
          "templateId": "delivery_exception_general"
        }
      },
      {
        "id": "failed_invalid_address_completion",
        "type": "completion",
        "content": "To resolve the address issue and offer reship:",
        "metadata": {
          "templateId": "invalid_address_exception"
        }
      },
      {
        "id": "failed_no_access_completion",
        "type": "completion",
        "content": "To explain access issue and next steps:",
        "metadata": {
          "templateId": "no_access_exception"
        }
      },
      {
        "id": "failed_no_such_number_completion",
        "type": "completion",
        "content": "To resolve the address number issue:",
        "metadata": {
          "templateId": "no_such_number_exception"
        }
      },
      {
        "id": "failed_payment_hold_completion",
        "type": "completion",
        "content": "To explain the payment hold situation:",
        "metadata": {
          "templateId": "carrier_payment_hold"
        }
      }
    ]
  }'::jsonb,
  version = 4,
  updated_at = now()
WHERE category = 'shipping' AND name = 'Shipping Issue Handler';
