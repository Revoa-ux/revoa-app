/*
  # Seed Initial Conversational Flows

  ## Overview
  Seeds the database with initial flow definitions for Return and Damage scenarios.
  These flows guide merchants step-by-step through handling customer service situations.

  ## Flows Created
  1. Return Flow - Guides merchant through processing a return request
  2. Damage Flow - Guides merchant through handling damaged item reports

  ## Flow Structure
  Each flow uses a decision tree with:
  - Question nodes (collect information)
  - Decision nodes (branch based on responses)
  - Info nodes (display information)
  - Completion nodes (end the flow)
*/

-- Insert Return Flow
INSERT INTO bot_flows (category, name, description, flow_definition, version, is_active)
VALUES (
  'return',
  'Return Request Handler',
  'Step-by-step guidance for processing customer return requests',
  '{
    "id": "return_flow_v1",
    "startNodeId": "return_intro",
    "nodes": [
      {
        "id": "return_intro",
        "type": "info",
        "content": "Let me help you process this return request. I''ll guide you through the key steps to handle this properly.",
        "nextNodeId": "return_know_reason"
      },
      {
        "id": "return_know_reason",
        "type": "question",
        "content": "Do you know the reason for the return?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "Yes", "value": "yes", "icon": "✓"},
          {"id": "no", "label": "No", "value": "no", "icon": "✗"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "return_know_reason", "operator": "equals", "value": "no"}],
            "nodeId": "return_ask_customer"
          },
          {
            "conditions": [{"field": "return_know_reason", "operator": "equals", "value": "yes"}],
            "nodeId": "return_select_reason"
          }
        ],
        "metadata": {
          "helpText": "Knowing the return reason helps us provide the right guidance for next steps."
        }
      },
      {
        "id": "return_ask_customer",
        "type": "info",
        "content": "Please ask the customer why they want to return the item. Once you know, reply with the reason to continue.",
        "nextNodeId": "return_select_reason",
        "metadata": {
          "helpText": "Common questions: What specific issue are you experiencing? Is the item defective, damaged, or just not what you expected?"
        }
      },
      {
        "id": "return_select_reason",
        "type": "question",
        "content": "What''s the reason for the return?",
        "responseType": "single_choice",
        "options": [
          {"id": "changed_mind", "label": "Changed Mind", "value": "changed_mind", "description": "Customer no longer wants the item"},
          {"id": "wrong_item", "label": "Wrong Item", "value": "wrong_item", "description": "Customer received incorrect product"},
          {"id": "defective", "label": "Defective", "value": "defective", "description": "Item has manufacturing defects"},
          {"id": "damaged", "label": "Damaged", "value": "damaged", "description": "Item arrived damaged"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "return_select_reason", "operator": "equals", "value": "changed_mind"}],
            "nodeId": "return_changed_mind_info"
          },
          {
            "conditions": [{"field": "return_select_reason", "operator": "in", "value": ["defective", "damaged"]}],
            "nodeId": "return_covered_info"
          },
          {
            "conditions": [{"field": "return_select_reason", "operator": "equals", "value": "wrong_item"}],
            "nodeId": "return_wrong_item_info"
          }
        ]
      },
      {
        "id": "return_changed_mind_info",
        "type": "info",
        "content": "For changed mind returns, check your return policy. If within the return window, customer pays return shipping. Generate a return label and provide return instructions.",
        "nextNodeId": "return_ready_for_wen"
      },
      {
        "id": "return_covered_info",
        "type": "info",
        "content": "For defective/damaged items, this is covered under warranty. We''ll handle the return shipping cost. You''ll need photos from the customer before proceeding.",
        "nextNodeId": "return_has_photos"
      },
      {
        "id": "return_has_photos",
        "type": "question",
        "content": "Has the customer sent photos of the issue?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "Yes", "value": "yes"},
          {"id": "no", "label": "No", "value": "no"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "return_has_photos", "operator": "equals", "value": "no"}],
            "nodeId": "return_request_photos"
          },
          {
            "conditions": [{"field": "return_has_photos", "operator": "equals", "value": "yes"}],
            "nodeId": "return_ready_for_wen"
          }
        ]
      },
      {
        "id": "return_request_photos",
        "type": "info",
        "content": "Please request photos from the customer showing the defect/damage. Once received, you can proceed with generating the WEN.",
        "nextNodeId": "return_ready_for_wen"
      },
      {
        "id": "return_wrong_item_info",
        "type": "info",
        "content": "For wrong item shipments, this is our error. We''ll cover return shipping and send the correct item at no additional cost to the customer.",
        "nextNodeId": "return_ready_for_wen"
      },
      {
        "id": "return_ready_for_wen",
        "type": "question",
        "content": "Ready to generate the WEN (Warehouse Entry Number)?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "Yes, Generate WEN", "value": "yes"},
          {"id": "no", "label": "Not Yet", "value": "no"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "return_ready_for_wen", "operator": "equals", "value": "yes"}],
            "nodeId": "return_completion"
          }
        ],
        "metadata": {
          "skipable": true
        }
      },
      {
        "id": "return_completion",
        "type": "completion",
        "content": "Perfect! You can now generate the WEN and provide return instructions to the customer. Use the email templates below to communicate next steps.",
        "metadata": {
          "templateSuggestions": ["return_approved", "return_instructions", "wen_generated"]
        }
      }
    ],
    "metadata": {
      "estimatedTime": 180,
      "category": "returns",
      "tags": ["customer_service", "returns", "logistics"]
    }
  }'::jsonb,
  1,
  true
) ON CONFLICT DO NOTHING;

-- Insert Damage Flow
INSERT INTO bot_flows (category, name, description, flow_definition, version, is_active)
VALUES (
  'damage',
  'Damage Report Handler',
  'Step-by-step guidance for handling damaged item reports',
  '{
    "id": "damage_flow_v1",
    "startNodeId": "damage_intro",
    "nodes": [
      {
        "id": "damage_intro",
        "type": "info",
        "content": "I''ll help you handle this damage report. First, let''s gather the necessary information to determine the best resolution.",
        "nextNodeId": "damage_has_photos"
      },
      {
        "id": "damage_has_photos",
        "type": "question",
        "content": "Has the customer sent photos of the damage?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "Yes", "value": "yes", "icon": "✓"},
          {"id": "no", "label": "No", "value": "no", "icon": "✗"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "damage_has_photos", "operator": "equals", "value": "no"}],
            "nodeId": "damage_request_photos"
          },
          {
            "conditions": [{"field": "damage_has_photos", "operator": "equals", "value": "yes"}],
            "nodeId": "damage_who_at_fault"
          }
        ]
      },
      {
        "id": "damage_request_photos",
        "type": "info",
        "content": "Please request clear photos from the customer showing the damage. Ask for photos of the item, packaging, and shipping label if visible.",
        "nextNodeId": "damage_who_at_fault",
        "metadata": {
          "helpText": "Good photos help us file claims with carriers and determine next steps faster."
        }
      },
      {
        "id": "damage_who_at_fault",
        "type": "question",
        "content": "Based on the photos, who''s at fault?",
        "responseType": "single_choice",
        "options": [
          {"id": "carrier", "label": "Carrier", "value": "carrier", "description": "Damage occurred during shipping"},
          {"id": "factory", "label": "Factory", "value": "factory", "description": "Item was damaged before shipping"},
          {"id": "customer", "label": "Customer", "value": "customer", "description": "Customer caused the damage"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "damage_who_at_fault", "operator": "equals", "value": "carrier"}],
            "nodeId": "damage_carrier_fault"
          },
          {
            "conditions": [{"field": "damage_who_at_fault", "operator": "equals", "value": "factory"}],
            "nodeId": "damage_factory_fault"
          },
          {
            "conditions": [{"field": "damage_who_at_fault", "operator": "equals", "value": "customer"}],
            "nodeId": "damage_customer_fault"
          }
        ]
      },
      {
        "id": "damage_carrier_fault",
        "type": "info",
        "content": "Carrier damage is typically covered by shipping insurance. We''ll file a claim and send a replacement. The customer can keep or dispose of the damaged item.",
        "nextNodeId": "damage_file_claim"
      },
      {
        "id": "damage_factory_fault",
        "type": "info",
        "content": "Factory defects are covered under warranty. We''ll send a replacement at no cost. Request the customer return the damaged item for inspection.",
        "nextNodeId": "damage_coverage_check"
      },
      {
        "id": "damage_customer_fault",
        "type": "info",
        "content": "Customer-caused damage isn''t covered by warranty. Offer a discount on a replacement purchase if appropriate, or guide them to proper care instructions.",
        "nextNodeId": "damage_completion"
      },
      {
        "id": "damage_file_claim",
        "type": "question",
        "content": "Do you want to file a carrier claim now?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "Yes", "value": "yes"},
          {"id": "later", "label": "I''ll Do It Later", "value": "later"}
        ],
        "nextNodeId": "damage_completion",
        "metadata": {
          "skipable": true
        }
      },
      {
        "id": "damage_coverage_check",
        "type": "question",
        "content": "Is the order still within the warranty period?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "Yes", "value": "yes"},
          {"id": "no", "label": "No", "value": "no"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "damage_coverage_check", "operator": "equals", "value": "yes"}],
            "nodeId": "damage_send_replacement"
          },
          {
            "conditions": [{"field": "damage_coverage_check", "operator": "equals", "value": "no"}],
            "nodeId": "damage_out_of_warranty"
          }
        ]
      },
      {
        "id": "damage_send_replacement",
        "type": "info",
        "content": "Great! Since it''s within warranty, prepare a replacement order. Generate a return WEN for the damaged item.",
        "nextNodeId": "damage_completion"
      },
      {
        "id": "damage_out_of_warranty",
        "type": "info",
        "content": "The order is outside the warranty period. Explain this to the customer and offer a discounted replacement if appropriate.",
        "nextNodeId": "damage_completion"
      },
      {
        "id": "damage_completion",
        "type": "completion",
        "content": "You''ve gathered all the info needed. Use the suggested email templates below to communicate the resolution to your customer.",
        "metadata": {
          "templateSuggestions": ["damage_carrier_claim", "damage_replacement", "damage_out_of_warranty"]
        }
      }
    ],
    "metadata": {
      "estimatedTime": 240,
      "category": "damage",
      "tags": ["customer_service", "quality", "warranty"]
    }
  }'::jsonb,
  1,
  true
) ON CONFLICT DO NOTHING;