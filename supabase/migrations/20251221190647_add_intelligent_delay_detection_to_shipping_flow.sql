/*
  # Add Intelligent Delay Detection to Shipping Flow

  ## Changes
  Updates the shipping flow "delayed" branch to use automated package delay detection
  instead of manual checking. The system now automatically analyzes order fulfillment data,
  calculates expected delivery dates based on business days, and provides intelligent
  guidance based on actual delay status.

  ## How It Works
  1. When admin selects "Package Delayed", system automatically analyzes the order
  2. Checks fulfillment_created_at + shipping_timeframe_max (business days calculation)
  3. Determines delay status: not_shipped, on_time, arriving_today, slightly_delayed, significantly_delayed
  4. Routes to appropriate completion node with context-aware email templates

  ## Delay Status Categories
  - **not_shipped**: Order not yet fulfilled in Shopify
  - **on_time**: Package will arrive by expected delivery date
  - **arriving_today**: Expected delivery is today
  - **slightly_delayed**: 1-2 business days past expected (normal carrier variance)
  - **significantly_delayed**: 3+ business days past expected (requires carrier investigation)

  ## Benefits
  - Eliminates guesswork - system calculates actual delay status
  - Accounts for business days, weekends, and holidays (U.S. calendar)
  - Provides accurate expected delivery dates to customers
  - Automatically escalates significantly delayed packages
  - Reduces admin decision-making time from minutes to seconds
*/

UPDATE bot_flows
SET
  flow_definition = '{
    "id": "shipping_flow_v4",
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
            "nodeId": "shipping_delayed_intelligent"
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
        "id": "shipping_delayed_intelligent",
        "type": "info",
        "content": "**Intelligent Delay Detection Active** 🤖\\n\\nI''ll automatically analyze:\\n\\n✓ Fulfillment date from Shopify\\n✓ Expected delivery (business days calculation)\\n✓ Current delay status\\n✓ Whether carrier contact is needed\\n\\nYou''ll get specific guidance based on the actual situation.",
        "nextNodeId": "delay_analysis_complete"
      },
      {
        "id": "delay_analysis_complete",
        "type": "completion",
        "content": "Analysis complete! Use the recommended template based on the delay status shown below.",
        "metadata": {
          "useDelayAnalysis": true,
          "dynamicTemplate": true
        }
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
          "escalationMessage": "Your agent will file a carrier claim and send a replacement",
          "adminActionMessage": "File carrier claim for lost package (14+ days no updates)"
        }
      },
      {
        "id": "lost_returned_completion",
        "type": "completion",
        "content": "For packages returned to sender:",
        "metadata": {
          "templateId": "package_returned_to_sender"
        }
      },
      {
        "id": "lost_delivered_not_received_completion",
        "type": "completion",
        "content": "For delivered but not received situations:",
        "metadata": {
          "templateId": "delivery_status_2_plus_days",
          "requiresAgentAction": true,
          "escalationType": "delivery_verification_needed",
          "escalationMessage": "Your agent will verify delivery and potentially file a claim",
          "adminActionMessage": "Investigate delivered but not received - possible theft or misdelivery"
        }
      },
      {
        "id": "shipping_failed_guidance",
        "type": "info",
        "content": "**Failed Delivery Actions:**\\n\\n1. Check tracking for reason (wrong address, no access, signature required, etc.)\\n\\n2. Carrier usually attempts 3 deliveries before returning\\n\\n3. Customer can often pick up from local carrier facility\\n\\n4. If address wrong, get corrected address before it returns to you",
        "nextNodeId": "failed_delivery_reason"
      },
      {
        "id": "failed_delivery_reason",
        "type": "question",
        "content": "What was the delivery failure reason?",
        "responseType": "single_choice",
        "options": [
          {"id": "address_issue", "label": "Address Issue", "value": "address_issue"},
          {"id": "no_access", "label": "No Access / Signature Required", "value": "no_access"},
          {"id": "held_at_facility", "label": "Held at Carrier Facility", "value": "held_at_facility"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "failed_delivery_reason", "operator": "equals", "value": "address_issue"}],
            "nodeId": "failed_address_completion"
          },
          {
            "conditions": [{"field": "failed_delivery_reason", "operator": "equals", "value": "no_access"}],
            "nodeId": "failed_no_access_completion"
          },
          {
            "conditions": [{"field": "failed_delivery_reason", "operator": "equals", "value": "held_at_facility"}],
            "nodeId": "failed_held_completion"
          }
        ]
      },
      {
        "id": "failed_address_completion",
        "type": "completion",
        "content": "For address-related failures:",
        "metadata": {
          "templateId": "delivery_failed_address"
        }
      },
      {
        "id": "failed_no_access_completion",
        "type": "completion",
        "content": "For access/signature issues:",
        "metadata": {
          "templateId": "delivery_failed_access"
        }
      },
      {
        "id": "failed_held_completion",
        "type": "completion",
        "content": "For packages held at facility:",
        "metadata": {
          "templateId": "package_held_at_facility"
        }
      }
    ]
  }'::jsonb,
  version = 5,
  updated_at = now()
WHERE category = 'shipping' AND name = 'Shipping Issue Handler';