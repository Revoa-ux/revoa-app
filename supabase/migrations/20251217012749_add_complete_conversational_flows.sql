/*
  # Add Complete Conversational Flows for All Issue Categories

  ## Overview
  Creates conversational flows for all remaining issue types that don't have flows yet.
  Each flow provides step-by-step guidance tailored to the specific issue type.

  ## New Flows
  1. Defective Product Flow - Separate from damage, handles non-working items
  2. Cancel/Modify Order Flow - Order changes and cancellations
  3. Wrong Item Flow - Incorrect product shipped
  4. Missing Items Flow - Incomplete order received
  5. Shipping/Delivery Flow - Tracking and delivery issues
  6. Refund Request Flow - Direct refund requests
  7. Replacement Flow - Item replacement requests

  ## Note
  Defective and Damaged are now SEPARATE flows because:
  - Defective = Product doesn't work (factory warranty)
  - Damaged = Physical damage (carrier/shipping issue)
*/

-- Defective Product Flow
INSERT INTO bot_flows (category, name, description, flow_definition, version, is_active)
VALUES (
  'defective',
  'Defective Product Handler',
  'Step-by-step guidance for handling defective product claims',
  '{
    "id": "defective_flow_v1",
    "startNodeId": "defective_intro",
    "nodes": [
      {
        "id": "defective_intro",
        "type": "info",
        "content": "I''ll help you handle this defective product claim. Let''s check warranty coverage and coordinate with the factory.",
        "nextNodeId": "defective_within_warranty"
      },
      {
        "id": "defective_within_warranty",
        "type": "question",
        "content": "Is the order within the warranty/coverage period?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "Yes, Within Coverage", "value": "yes", "icon": "✓"},
          {"id": "no", "label": "No, Outside Coverage", "value": "no", "icon": "✗"},
          {"id": "unsure", "label": "Not Sure", "value": "unsure", "icon": "?"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "defective_within_warranty", "operator": "equals", "value": "no"}],
            "nodeId": "defective_out_of_warranty"
          },
          {
            "conditions": [{"field": "defective_within_warranty", "operator": "in", "value": ["yes", "unsure"]}],
            "nodeId": "defective_gather_info"
          }
        ]
      },
      {
        "id": "defective_out_of_warranty",
        "type": "info",
        "content": "The item is outside the warranty period. Explain this to the customer and offer a discounted replacement if appropriate. Some regions have statutory warranty requirements, so check local regulations.",
        "nextNodeId": "defective_completion"
      },
      {
        "id": "defective_gather_info",
        "type": "question",
        "content": "Has the customer provided details about the defect?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "Yes", "value": "yes"},
          {"id": "no", "label": "No", "value": "no"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "defective_gather_info", "operator": "equals", "value": "no"}],
            "nodeId": "defective_request_info"
          },
          {
            "conditions": [{"field": "defective_gather_info", "operator": "equals", "value": "yes"}],
            "nodeId": "defective_contact_factory"
          }
        ]
      },
      {
        "id": "defective_request_info",
        "type": "info",
        "content": "Ask the customer: What specifically isn''t working? When did they first notice the issue? Can they provide photos or video showing the problem?",
        "nextNodeId": "defective_contact_factory"
      },
      {
        "id": "defective_contact_factory",
        "type": "info",
        "content": "Contact the factory with the defect details, photos, and order information. They''ll assess and decide on replacement, refund, or repair. Typical response time is 24-48 hours.",
        "nextNodeId": "defective_completion"
      },
      {
        "id": "defective_completion",
        "type": "completion",
        "content": "You have all the info needed. Use the email templates to communicate the next steps to your customer.",
        "metadata": {
          "templateSuggestions": ["defect_claim_filed", "defect_replacement", "defect_out_of_warranty"]
        }
      }
    ]
  }'::jsonb,
  1,
  true
) ON CONFLICT DO NOTHING;

-- Cancel/Modify Order Flow
INSERT INTO bot_flows (category, name, description, flow_definition, version, is_active)
VALUES (
  'cancel_modify',
  'Cancel/Modify Order Handler',
  'Guidance for handling order cancellations and modifications',
  '{
    "id": "cancel_modify_flow_v1",
    "startNodeId": "cancel_intro",
    "nodes": [
      {
        "id": "cancel_intro",
        "type": "info",
        "content": "Let''s see if we can cancel or modify this order. First, I need to check the fulfillment status.",
        "nextNodeId": "cancel_check_status"
      },
      {
        "id": "cancel_check_status",
        "type": "question",
        "content": "Has the order already shipped?",
        "responseType": "single_choice",
        "options": [
          {"id": "not_shipped", "label": "Not Shipped Yet", "value": "not_shipped", "icon": "📦"},
          {"id": "shipped", "label": "Already Shipped", "value": "shipped", "icon": "🚚"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "cancel_check_status", "operator": "equals", "value": "shipped"}],
            "nodeId": "cancel_already_shipped"
          },
          {
            "conditions": [{"field": "cancel_check_status", "operator": "equals", "value": "not_shipped"}],
            "nodeId": "cancel_what_change"
          }
        ]
      },
      {
        "id": "cancel_already_shipped",
        "type": "info",
        "content": "The order has already shipped. Cancellation isn''t possible, but the customer can process a return once received. Address changes may be possible depending on the carrier.",
        "nextNodeId": "cancel_completion"
      },
      {
        "id": "cancel_what_change",
        "type": "question",
        "content": "What does the customer want to change?",
        "responseType": "single_choice",
        "options": [
          {"id": "cancel_full", "label": "Cancel Entire Order", "value": "cancel_full"},
          {"id": "address", "label": "Change Address", "value": "address"},
          {"id": "items", "label": "Modify Items", "value": "items"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "cancel_what_change", "operator": "equals", "value": "cancel_full"}],
            "nodeId": "cancel_process"
          },
          {
            "conditions": [{"field": "cancel_what_change", "operator": "equals", "value": "address"}],
            "nodeId": "cancel_address_change"
          },
          {
            "conditions": [{"field": "cancel_what_change", "operator": "equals", "value": "items"}],
            "nodeId": "cancel_items_change"
          }
        ]
      },
      {
        "id": "cancel_process",
        "type": "info",
        "content": "Cancel the order in Shopify and process a full refund. No fees since it hasn''t shipped yet.",
        "nextNodeId": "cancel_completion"
      },
      {
        "id": "cancel_address_change",
        "type": "info",
        "content": "Contact your fulfillment team or logistics provider immediately with the new address. Update it in Shopify as well.",
        "nextNodeId": "cancel_completion"
      },
      {
        "id": "cancel_items_change",
        "type": "info",
        "content": "Cancel the current order and help the customer place a new order with the correct items. Process a full refund for the canceled order.",
        "nextNodeId": "cancel_completion"
      },
      {
        "id": "cancel_completion",
        "type": "completion",
        "content": "Perfect! Use the email templates to confirm the changes with your customer.",
        "metadata": {
          "templateSuggestions": ["order_canceled", "address_updated", "order_modified"]
        }
      }
    ]
  }'::jsonb,
  1,
  true
) ON CONFLICT DO NOTHING;

-- Wrong Item Flow
INSERT INTO bot_flows (category, name, description, flow_definition, version, is_active)
VALUES (
  'wrong_item',
  'Wrong Item Handler',
  'Guidance for resolving wrong item shipments',
  '{
    "id": "wrong_item_flow_v1",
    "startNodeId": "wrong_intro",
    "nodes": [
      {
        "id": "wrong_intro",
        "type": "info",
        "content": "I''ll help you resolve this wrong item situation. This is our error, so we''ll make it right at no cost to the customer.",
        "nextNodeId": "wrong_verify"
      },
      {
        "id": "wrong_verify",
        "type": "question",
        "content": "Have you verified what they received vs. what they ordered?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "Yes, Verified", "value": "yes"},
          {"id": "no", "label": "Need to Verify", "value": "no"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "wrong_verify", "operator": "equals", "value": "no"}],
            "nodeId": "wrong_request_info"
          },
          {
            "conditions": [{"field": "wrong_verify", "operator": "equals", "value": "yes"}],
            "nodeId": "wrong_send_correct"
          }
        ]
      },
      {
        "id": "wrong_request_info",
        "type": "info",
        "content": "Ask for photos showing the item label/packaging. Check their order in Shopify to confirm what was supposed to ship.",
        "nextNodeId": "wrong_send_correct"
      },
      {
        "id": "wrong_send_correct",
        "type": "info",
        "content": "Ship the correct item immediately (expedited if possible). Provide a prepaid return label for the wrong item. No additional charges to the customer.",
        "nextNodeId": "wrong_completion"
      },
      {
        "id": "wrong_completion",
        "type": "completion",
        "content": "All set! Communicate the resolution using the email templates below.",
        "metadata": {
          "templateSuggestions": ["wrong_item_apology", "correct_item_shipped", "return_label_provided"]
        }
      }
    ]
  }'::jsonb,
  1,
  true
) ON CONFLICT DO NOTHING;

-- Missing Items Flow
INSERT INTO bot_flows (category, name, description, flow_definition, version, is_active)
VALUES (
  'missing_items',
  'Missing Items Handler',
  'Guidance for handling missing items from orders',
  '{
    "id": "missing_items_flow_v1",
    "startNodeId": "missing_intro",
    "nodes": [
      {
        "id": "missing_intro",
        "type": "info",
        "content": "Let''s get those missing items sent out. This is a fulfillment error on our end.",
        "nextNodeId": "missing_verify"
      },
      {
        "id": "missing_verify",
        "type": "question",
        "content": "Have you verified which items are missing?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "Yes", "value": "yes"},
          {"id": "no", "label": "No", "value": "no"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "missing_verify", "operator": "equals", "value": "no"}],
            "nodeId": "missing_gather_info"
          },
          {
            "conditions": [{"field": "missing_verify", "operator": "equals", "value": "yes"}],
            "nodeId": "missing_ship"
          }
        ]
      },
      {
        "id": "missing_gather_info",
        "type": "info",
        "content": "Ask: What items were supposed to be in the package? What did they actually receive? Request photos if helpful.",
        "nextNodeId": "missing_ship"
      },
      {
        "id": "missing_ship",
        "type": "info",
        "content": "Ship the missing items immediately at no charge. Use expedited shipping if it''s a significant portion of the order. Consider a goodwill gesture for the inconvenience.",
        "nextNodeId": "missing_completion"
      },
      {
        "id": "missing_completion",
        "type": "completion",
        "content": "Done! Use the templates to communicate shipping details and any goodwill offers.",
        "metadata": {
          "templateSuggestions": ["missing_items_shipped", "apology_with_discount"]
        }
      }
    ]
  }'::jsonb,
  1,
  true
) ON CONFLICT DO NOTHING;

-- Shipping/Delivery Flow
INSERT INTO bot_flows (category, name, description, flow_definition, version, is_active)
VALUES (
  'shipping',
  'Shipping Issue Handler',
  'Guidance for handling shipping and delivery concerns',
  '{
    "id": "shipping_flow_v1",
    "startNodeId": "shipping_intro",
    "nodes": [
      {
        "id": "shipping_intro",
        "type": "info",
        "content": "Let''s look into this shipping concern. I''ll help you determine the issue and next steps.",
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
        "content": "Check the carrier website directly - they often have more detailed tracking than Shopify shows. If still stuck for 7+ days, contact the carrier.",
        "nextNodeId": "shipping_completion"
      },
      {
        "id": "shipping_delayed_info",
        "type": "info",
        "content": "Check estimated delivery date. If within normal range, reassure customer. If significantly delayed, contact carrier for investigation.",
        "nextNodeId": "shipping_completion"
      },
      {
        "id": "shipping_lost_check",
        "type": "info",
        "content": "Packages are considered lost after 14 days with no updates. File a claim with the carrier and send a replacement to the customer.",
        "nextNodeId": "shipping_completion"
      },
      {
        "id": "shipping_failed_info",
        "type": "info",
        "content": "Help customer arrange redelivery or pickup with the carrier. Provide carrier contact info and tracking number.",
        "nextNodeId": "shipping_completion"
      },
      {
        "id": "shipping_completion",
        "type": "completion",
        "content": "Great! Use the templates to update your customer on the shipping status.",
        "metadata": {
          "templateSuggestions": ["tracking_update", "delayed_package", "lost_package_replacement"]
        }
      }
    ]
  }'::jsonb,
  1,
  true
) ON CONFLICT DO NOTHING;

-- Refund Request Flow
INSERT INTO bot_flows (category, name, description, flow_definition, version, is_active)
VALUES (
  'refund',
  'Refund Request Handler',
  'Guidance for processing refund requests',
  '{
    "id": "refund_flow_v1",
    "startNodeId": "refund_intro",
    "nodes": [
      {
        "id": "refund_intro",
        "type": "info",
        "content": "Let''s determine if a refund is appropriate and process it correctly.",
        "nextNodeId": "refund_reason"
      },
      {
        "id": "refund_reason",
        "type": "question",
        "content": "Why is the customer requesting a refund?",
        "responseType": "single_choice",
        "options": [
          {"id": "not_received", "label": "Never Received", "value": "not_received"},
          {"id": "wants_return", "label": "Wants to Return", "value": "wants_return"},
          {"id": "defective", "label": "Defective/Wrong Item", "value": "defective"},
          {"id": "partial", "label": "Partial Refund Request", "value": "partial"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "refund_reason", "operator": "equals", "value": "not_received"}],
            "nodeId": "refund_not_received"
          },
          {
            "conditions": [{"field": "refund_reason", "operator": "equals", "value": "wants_return"}],
            "nodeId": "refund_return_first"
          },
          {
            "conditions": [{"field": "refund_reason", "operator": "equals", "value": "defective"}],
            "nodeId": "refund_full"
          },
          {
            "conditions": [{"field": "refund_reason", "operator": "equals", "value": "partial"}],
            "nodeId": "refund_partial"
          }
        ]
      },
      {
        "id": "refund_not_received",
        "type": "info",
        "content": "Verify tracking shows non-delivery. Wait 14 days from ship date, then issue full refund including shipping.",
        "nextNodeId": "refund_completion"
      },
      {
        "id": "refund_return_first",
        "type": "info",
        "content": "They must follow the return process first. Only refund AFTER warehouse receives and inspects the item. May deduct return shipping if customer''s choice.",
        "nextNodeId": "refund_completion"
      },
      {
        "id": "refund_full",
        "type": "info",
        "content": "Issue full refund including original shipping since it''s our error. Return may not be required depending on item value and condition.",
        "nextNodeId": "refund_completion"
      },
      {
        "id": "refund_partial",
        "type": "info",
        "content": "Negotiate a reasonable partial refund for minor issues they''re willing to keep the item for. Document the agreement.",
        "nextNodeId": "refund_completion"
      },
      {
        "id": "refund_completion",
        "type": "completion",
        "content": "Process the refund and communicate using the email templates.",
        "metadata": {
          "templateSuggestions": ["refund_processed", "partial_refund_offer", "return_for_refund"]
        }
      }
    ]
  }'::jsonb,
  1,
  true
) ON CONFLICT DO NOTHING;

-- Replacement Flow
INSERT INTO bot_flows (category, name, description, flow_definition, version, is_active)
VALUES (
  'replacement',
  'Replacement Request Handler',
  'Guidance for handling replacement requests',
  '{
    "id": "replacement_flow_v1",
    "startNodeId": "replacement_intro",
    "nodes": [
      {
        "id": "replacement_intro",
        "type": "info",
        "content": "Let''s determine what type of replacement this is and who covers it.",
        "nextNodeId": "replacement_reason"
      },
      {
        "id": "replacement_reason",
        "type": "question",
        "content": "Why do they need a replacement?",
        "responseType": "single_choice",
        "options": [
          {"id": "defective", "label": "Defective", "value": "defective"},
          {"id": "damaged", "label": "Damaged", "value": "damaged"},
          {"id": "wrong", "label": "Wrong Item", "value": "wrong"},
          {"id": "customer_error", "label": "Customer Ordered Wrong", "value": "customer_error"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "replacement_reason", "operator": "in", "value": ["defective", "damaged", "wrong"]}],
            "nodeId": "replacement_free"
          },
          {
            "conditions": [{"field": "replacement_reason", "operator": "equals", "value": "customer_error"}],
            "nodeId": "replacement_paid"
          }
        ]
      },
      {
        "id": "replacement_free",
        "type": "info",
        "content": "This is a free replacement since it''s our responsibility. Ship the replacement immediately and handle the return separately.",
        "nextNodeId": "replacement_completion"
      },
      {
        "id": "replacement_paid",
        "type": "info",
        "content": "Customer ordered the wrong item. They can place a new order for the correct one and return the original for a refund.",
        "nextNodeId": "replacement_completion"
      },
      {
        "id": "replacement_completion",
        "type": "completion",
        "content": "Ready to send! Use the templates to communicate the replacement details.",
        "metadata": {
          "templateSuggestions": ["free_replacement", "exchange_instructions", "paid_replacement"]
        }
      }
    ]
  }'::jsonb,
  1,
  true
) ON CONFLICT DO NOTHING;
