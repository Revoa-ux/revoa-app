/*
  # Create Pre-Shipment Issue Conversational Flows

  ## Overview
  Creates conversational flows specifically for pre-shipment issues detected before order fulfillment.
  These flows guide both customers and admins through resolution processes.

  ## New Flows
  1. Inventory Shortage Flow - Out of stock detection
  2. Quality Issue Pre-Ship Flow - Quality problems detected before shipping
  3. Supplier Delay Flow - Supplier unable to fulfill on time
  4. Variant Mismatch Flow - Wrong product variant prepared

  ## Integration
  - These flows integrate with pre_shipment_issues table
  - Automatically triggered when issues are detected
  - Support invoice/quote adjustments through resolution service
*/

-- Inventory Shortage / Out of Stock Flow
INSERT INTO bot_flows (category, name, description, flow_definition, version, is_active)
VALUES (
  'pre_ship_inventory',
  'Pre-Shipment Inventory Issue Handler',
  'Handles inventory shortages detected before shipment with resolution options',
  '{
    "id": "pre_ship_inventory_v1",
    "startNodeId": "inventory_intro",
    "nodes": [
      {
        "id": "inventory_intro",
        "type": "info",
        "content": "We detected that one or more items in this order are currently out of stock. Let me help you resolve this quickly.",
        "nextNodeId": "inventory_details"
      },
      {
        "id": "inventory_details",
        "type": "info",
        "content": "Issue Details: The product is temporarily unavailable from our supplier. I have several resolution options for you to offer the customer.",
        "nextNodeId": "inventory_resolution_choice"
      },
      {
        "id": "inventory_resolution_choice",
        "type": "question",
        "content": "What resolution would you like to proceed with?",
        "responseType": "single_choice",
        "options": [
          {"id": "substitute", "label": "Offer Product Substitution", "value": "substitute", "icon": "🔄"},
          {"id": "delay", "label": "Wait for Restock", "value": "delay", "icon": "⏰"},
          {"id": "refund", "label": "Issue Refund", "value": "refund", "icon": "💰"},
          {"id": "cancel", "label": "Cancel Line Item", "value": "cancel", "icon": "✖️"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "inventory_resolution_choice", "operator": "equals", "value": "substitute"}],
            "nodeId": "inventory_substitute"
          },
          {
            "conditions": [{"field": "inventory_resolution_choice", "operator": "equals", "value": "delay"}],
            "nodeId": "inventory_delay"
          },
          {
            "conditions": [{"field": "inventory_resolution_choice", "operator": "equals", "value": "refund"}],
            "nodeId": "inventory_refund"
          },
          {
            "conditions": [{"field": "inventory_resolution_choice", "operator": "equals", "value": "cancel"}],
            "nodeId": "inventory_cancel"
          }
        ]
      },
      {
        "id": "inventory_substitute",
        "type": "info",
        "content": "SUBSTITUTION: Check the product catalog for similar items. When you select a substitute, the system will automatically calculate price differences and update the invoice if needed. Customer approval is required if the substitute costs more.",
        "nextNodeId": "inventory_substitute_select"
      },
      {
        "id": "inventory_substitute_select",
        "type": "question",
        "content": "Have you selected a substitute product?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "Yes, Ready to Proceed", "value": "yes"},
          {"id": "no", "label": "No Suitable Substitute", "value": "no"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "inventory_substitute_select", "operator": "equals", "value": "yes"}],
            "nodeId": "inventory_customer_notify_sub"
          },
          {
            "conditions": [{"field": "inventory_substitute_select", "operator": "equals", "value": "no"}],
            "nodeId": "inventory_resolution_choice"
          }
        ]
      },
      {
        "id": "inventory_customer_notify_sub",
        "type": "info",
        "content": "Perfect! The system has calculated the price difference and updated the invoice. Use the substitution template to notify the customer. If the substitute costs more, they must approve before you proceed.",
        "nextNodeId": "inventory_completion"
      },
      {
        "id": "inventory_delay",
        "type": "question",
        "content": "What is the estimated restock date?",
        "responseType": "text_input",
        "placeholder": "Enter estimated date (e.g., December 30, 2025)",
        "nextNodeId": "inventory_customer_notify_delay"
      },
      {
        "id": "inventory_customer_notify_delay",
        "type": "info",
        "content": "Send the delay notification email to the customer with the new expected ship date. Ask if they want to wait or prefer an alternative resolution. Customer approval is required to proceed with the delay.",
        "nextNodeId": "inventory_completion"
      },
      {
        "id": "inventory_refund",
        "type": "info",
        "content": "REFUND: The system will automatically calculate the refund amount and adjust the invoice. Process the refund through Shopify and notify the customer. No customer approval needed for refunds.",
        "nextNodeId": "inventory_customer_notify_refund"
      },
      {
        "id": "inventory_customer_notify_refund",
        "type": "info",
        "content": "The invoice has been adjusted and the refund is ready to process. Use the refund notification template to inform the customer. Refunds typically process in 3-5 business days.",
        "nextNodeId": "inventory_completion"
      },
      {
        "id": "inventory_cancel",
        "type": "info",
        "content": "CANCELLATION: This will remove the line item from the order and issue a full refund. The invoice will be automatically adjusted. Notify the customer about the cancellation.",
        "nextNodeId": "inventory_customer_notify_cancel"
      },
      {
        "id": "inventory_customer_notify_cancel",
        "type": "info",
        "content": "The line item has been cancelled and the invoice adjusted. Send the cancellation notification to the customer. The refund will process automatically.",
        "nextNodeId": "inventory_completion"
      },
      {
        "id": "inventory_completion",
        "type": "completion",
        "content": "Pre-shipment inventory issue resolved! All invoice and quote adjustments have been processed automatically. The customer has been notified.",
        "metadata": {
          "templateSuggestions": ["pre_ship_substitute", "pre_ship_delay", "pre_ship_refund", "pre_ship_cancel"],
          "invoiceAdjusted": true
        }
      }
    ]
  }'::jsonb,
  1,
  true
) ON CONFLICT DO NOTHING;

-- Pre-Shipment Quality Issue Flow
INSERT INTO bot_flows (category, name, description, flow_definition, version, is_active)
VALUES (
  'pre_ship_quality',
  'Pre-Shipment Quality Issue Handler',
  'Handles quality problems detected during pre-shipment inspection',
  '{
    "id": "pre_ship_quality_v1",
    "startNodeId": "quality_intro",
    "nodes": [
      {
        "id": "quality_intro",
        "type": "info",
        "content": "A quality issue was detected during pre-shipment inspection. This is good - we caught it before it reached the customer!",
        "nextNodeId": "quality_severity"
      },
      {
        "id": "quality_severity",
        "type": "question",
        "content": "How severe is the quality issue?",
        "responseType": "single_choice",
        "options": [
          {"id": "minor", "label": "Minor (Cosmetic)", "value": "minor", "icon": "⚠️"},
          {"id": "major", "label": "Major (Functional)", "value": "major", "icon": "❌"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "quality_severity", "operator": "equals", "value": "minor"}],
            "nodeId": "quality_minor_options"
          },
          {
            "conditions": [{"field": "quality_severity", "operator": "equals", "value": "major"}],
            "nodeId": "quality_major_replace"
          }
        ]
      },
      {
        "id": "quality_minor_options",
        "type": "question",
        "content": "For minor cosmetic issues, what would you like to do?",
        "responseType": "single_choice",
        "options": [
          {"id": "proceed", "label": "Ship As-Is with Discount", "value": "proceed", "icon": "✓"},
          {"id": "replace", "label": "Replace with Perfect Unit", "value": "replace", "icon": "🔄"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "quality_minor_options", "operator": "equals", "value": "proceed"}],
            "nodeId": "quality_discount"
          },
          {
            "conditions": [{"field": "quality_minor_options", "operator": "equals", "value": "replace"}],
            "nodeId": "quality_major_replace"
          }
        ]
      },
      {
        "id": "quality_discount",
        "type": "question",
        "content": "What discount percentage would you like to offer? (e.g., 10, 15, 20)",
        "responseType": "text_input",
        "placeholder": "Enter discount % (10-30)",
        "nextNodeId": "quality_customer_approval"
      },
      {
        "id": "quality_customer_approval",
        "type": "info",
        "content": "The system has calculated the discounted price and adjusted the invoice. Contact the customer to explain the minor issue and offer the discount. They must approve before shipping.",
        "nextNodeId": "quality_completion"
      },
      {
        "id": "quality_major_replace",
        "type": "info",
        "content": "REPLACEMENT REQUIRED: Contact the supplier to source a replacement unit. The original item will be marked as defective. No customer communication needed yet - we will ship the replacement on the original timeline.",
        "nextNodeId": "quality_supplier_contact"
      },
      {
        "id": "quality_supplier_contact",
        "type": "question",
        "content": "Can the supplier provide a replacement in time?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "Yes, On Time", "value": "yes"},
          {"id": "delayed", "label": "Delayed", "value": "delayed"},
          {"id": "unavailable", "label": "Not Available", "value": "unavailable"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "quality_supplier_contact", "operator": "equals", "value": "yes"}],
            "nodeId": "quality_replace_success"
          },
          {
            "conditions": [{"field": "quality_supplier_contact", "operator": "equals", "value": "delayed"}],
            "nodeId": "quality_delay_customer"
          },
          {
            "conditions": [{"field": "quality_supplier_contact", "operator": "equals", "value": "unavailable"}],
            "nodeId": "quality_substitute_or_refund"
          }
        ]
      },
      {
        "id": "quality_replace_success",
        "type": "info",
        "content": "Perfect! The replacement is secured and will ship on schedule. No customer notification needed. The issue is resolved internally.",
        "nextNodeId": "quality_completion"
      },
      {
        "id": "quality_delay_customer",
        "type": "info",
        "content": "Contact the customer about the delay. Explain that we caught a quality issue before shipping and are getting them a perfect replacement. Provide the new ship date and ask for their approval.",
        "nextNodeId": "quality_completion"
      },
      {
        "id": "quality_substitute_or_refund",
        "type": "info",
        "content": "The exact product is unavailable. Offer the customer: (1) A substitute product, or (2) A full refund. Use the inventory shortage flow to handle the substitution if they choose that option.",
        "nextNodeId": "quality_completion"
      },
      {
        "id": "quality_completion",
        "type": "completion",
        "content": "Pre-shipment quality issue handled! The invoice has been adjusted if needed. Customer notification sent if required.",
        "metadata": {
          "templateSuggestions": ["quality_discount_offer", "quality_delay_notification", "quality_refund"],
          "invoiceAdjusted": true
        }
      }
    ]
  }'::jsonb,
  1,
  true
) ON CONFLICT DO NOTHING;

-- Supplier Delay Flow
INSERT INTO bot_flows (category, name, description, flow_definition, version, is_active)
VALUES (
  'pre_ship_supplier_delay',
  'Supplier Delay Handler',
  'Handles supplier delays detected before order fulfillment',
  '{
    "id": "pre_ship_supplier_delay_v1",
    "startNodeId": "delay_intro",
    "nodes": [
      {
        "id": "delay_intro",
        "type": "info",
        "content": "The supplier has notified us of a delay for this order. Let me help you handle this proactively with the customer.",
        "nextNodeId": "delay_duration"
      },
      {
        "id": "delay_duration",
        "type": "question",
        "content": "How long is the expected delay?",
        "responseType": "single_choice",
        "options": [
          {"id": "short", "label": "1-3 Days", "value": "short", "icon": "📅"},
          {"id": "medium", "label": "4-7 Days", "value": "medium", "icon": "📆"},
          {"id": "long", "label": "8+ Days", "value": "long", "icon": "🗓️"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "delay_duration", "operator": "equals", "value": "short"}],
            "nodeId": "delay_short_handle"
          },
          {
            "conditions": [{"field": "delay_duration", "operator": "in", "value": ["medium", "long"]}],
            "nodeId": "delay_long_options"
          }
        ]
      },
      {
        "id": "delay_short_handle",
        "type": "info",
        "content": "For short delays (1-3 days), notify the customer about the slight delay and provide the new expected ship date. Most customers accept short delays without issue.",
        "nextNodeId": "delay_notify_customer"
      },
      {
        "id": "delay_long_options",
        "type": "info",
        "content": "For longer delays, offer the customer multiple options: (1) Wait for the original product, (2) Switch to a substitute, or (3) Cancel and refund. Let them choose what works best.",
        "nextNodeId": "delay_customer_choice"
      },
      {
        "id": "delay_customer_choice",
        "type": "question",
        "content": "What resolution does the customer prefer?",
        "responseType": "single_choice",
        "options": [
          {"id": "wait", "label": "Wait for Original", "value": "wait", "icon": "⏰"},
          {"id": "substitute", "label": "Accept Substitute", "value": "substitute", "icon": "🔄"},
          {"id": "cancel", "label": "Cancel & Refund", "value": "cancel", "icon": "💰"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "delay_customer_choice", "operator": "equals", "value": "wait"}],
            "nodeId": "delay_accepted"
          },
          {
            "conditions": [{"field": "delay_customer_choice", "operator": "equals", "value": "substitute"}],
            "nodeId": "delay_substitute"
          },
          {
            "conditions": [{"field": "delay_customer_choice", "operator": "equals", "value": "cancel"}],
            "nodeId": "delay_cancel"
          }
        ]
      },
      {
        "id": "delay_notify_customer",
        "type": "info",
        "content": "Send the delay notification with the new ship date. Include an apology and explanation. The order will proceed with the new timeline.",
        "nextNodeId": "delay_completion"
      },
      {
        "id": "delay_accepted",
        "type": "info",
        "content": "Customer has agreed to wait. Update the order with the new expected ship date. Send a confirmation email thanking them for their patience.",
        "nextNodeId": "delay_completion"
      },
      {
        "id": "delay_substitute",
        "type": "info",
        "content": "Customer wants a substitute. Use the pre-shipment inventory flow to handle the substitution. The system will calculate price differences and adjust the invoice automatically.",
        "nextNodeId": "delay_completion"
      },
      {
        "id": "delay_cancel",
        "type": "info",
        "content": "Process the cancellation and refund. The invoice will be automatically adjusted. Send the cancellation confirmation to the customer.",
        "nextNodeId": "delay_completion"
      },
      {
        "id": "delay_completion",
        "type": "completion",
        "content": "Supplier delay handled! The customer has been notified and the order status updated. Invoice adjusted if needed.",
        "metadata": {
          "templateSuggestions": ["supplier_delay_short", "supplier_delay_options", "delay_accepted", "delay_cancelled"],
          "invoiceAdjusted": false
        }
      }
    ]
  }'::jsonb,
  1,
  true
) ON CONFLICT DO NOTHING;

-- Variant Mismatch Flow
INSERT INTO bot_flows (category, name, description, flow_definition, version, is_active)
VALUES (
  'pre_ship_variant_mismatch',
  'Variant Mismatch Handler',
  'Handles cases where wrong product variant was prepared for shipment',
  '{
    "id": "pre_ship_variant_mismatch_v1",
    "startNodeId": "variant_intro",
    "nodes": [
      {
        "id": "variant_intro",
        "type": "info",
        "content": "A variant mismatch was detected - the prepared product does not match what the customer ordered. Let me help you fix this before it ships.",
        "nextNodeId": "variant_details"
      },
      {
        "id": "variant_details",
        "type": "info",
        "content": "Review: Customer ordered [X], but [Y] was prepared for shipment. This could be a picking error or inventory mix-up.",
        "nextNodeId": "variant_correct_available"
      },
      {
        "id": "variant_correct_available",
        "type": "question",
        "content": "Is the correct variant available in stock?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "Yes, Available", "value": "yes", "icon": "✓"},
          {"id": "no", "label": "Not Available", "value": "no", "icon": "✗"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "variant_correct_available", "operator": "equals", "value": "yes"}],
            "nodeId": "variant_swap"
          },
          {
            "conditions": [{"field": "variant_correct_available", "operator": "equals", "value": "no"}],
            "nodeId": "variant_offer_prepared"
          }
        ]
      },
      {
        "id": "variant_swap",
        "type": "info",
        "content": "SWAP THE PRODUCT: Replace the incorrect variant with the correct one. No customer communication needed - this is an internal fix. Ship the correct item on schedule.",
        "nextNodeId": "variant_completion"
      },
      {
        "id": "variant_offer_prepared",
        "type": "question",
        "content": "The correct variant is unavailable. Would you like to:",
        "responseType": "single_choice",
        "options": [
          {"id": "offer_wrong", "label": "Offer the Prepared Variant", "value": "offer_wrong", "icon": "🔄"},
          {"id": "delay", "label": "Delay for Correct Item", "value": "delay", "icon": "⏰"},
          {"id": "refund", "label": "Refund Customer", "value": "refund", "icon": "💰"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "variant_offer_prepared", "operator": "equals", "value": "offer_wrong"}],
            "nodeId": "variant_customer_choice"
          },
          {
            "conditions": [{"field": "variant_offer_prepared", "operator": "equals", "value": "delay"}],
            "nodeId": "variant_delay"
          },
          {
            "conditions": [{"field": "variant_offer_prepared", "operator": "equals", "value": "refund"}],
            "nodeId": "variant_refund"
          }
        ]
      },
      {
        "id": "variant_customer_choice",
        "type": "info",
        "content": "Contact the customer: Explain the situation honestly, offer the available variant (with any price difference), and let them decide. If the available variant costs less, offer it at the lower price.",
        "nextNodeId": "variant_awaiting_response"
      },
      {
        "id": "variant_awaiting_response",
        "type": "question",
        "content": "Did the customer accept the alternative variant?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "Yes, Accepted", "value": "yes"},
          {"id": "no", "label": "No, Declined", "value": "no"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "variant_awaiting_response", "operator": "equals", "value": "yes"}],
            "nodeId": "variant_proceed_alt"
          },
          {
            "conditions": [{"field": "variant_awaiting_response", "operator": "equals", "value": "no"}],
            "nodeId": "variant_refund"
          }
        ]
      },
      {
        "id": "variant_proceed_alt",
        "type": "info",
        "content": "Great! Update the order to reflect the accepted variant. Adjust the invoice for any price difference. Ship the alternative variant.",
        "nextNodeId": "variant_completion"
      },
      {
        "id": "variant_delay",
        "type": "info",
        "content": "Hold the shipment and wait for the correct variant to be restocked. Notify the customer about the delay with a new expected ship date.",
        "nextNodeId": "variant_completion"
      },
      {
        "id": "variant_refund",
        "type": "info",
        "content": "Process the refund for this line item. The invoice will be automatically adjusted. Send the refund notification to the customer.",
        "nextNodeId": "variant_completion"
      },
      {
        "id": "variant_completion",
        "type": "completion",
        "content": "Variant mismatch resolved! The order has been corrected and invoice adjusted if needed. Crisis averted before shipping!",
        "metadata": {
          "templateSuggestions": ["variant_offer_alternative", "variant_delay_notification", "variant_refund"],
          "invoiceAdjusted": true
        }
      }
    ]
  }'::jsonb,
  1,
  true
) ON CONFLICT DO NOTHING;
