/*
  # Update Damage Report Flow with Attachments and Warranty Auto-Detection

  ## Overview
  Updates the damage report flow to:
  1. Use attachment node for photo collection
  2. Auto-detect and display warranty status
  3. Add pause/resume functionality
  4. Improve business logic flow

  ## Changes
  - Add attachment node type for mandatory photo upload
  - Remove manual warranty questions (auto-calculated from database)
  - Add decision points based on warranty status
  - Simplify agent workflow
  - Add factory communication guidance
*/

-- Update the damage flow with new structure
UPDATE bot_flows
SET
  flow_definition = '{
    "id": "damage_flow_v2",
    "startNodeId": "damage_intro",
    "nodes": [
      {
        "id": "damage_intro",
        "type": "info",
        "content": "I''ll help you handle this damage claim. Let''s check if the customer has sent photos of the damage.",
        "nextNodeId": "damage_check_photos"
      },
      {
        "id": "damage_check_photos",
        "type": "question",
        "content": "Has the customer sent damage photos?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "Yes, Photos Received", "value": "yes", "icon": "✓"},
          {"id": "no", "label": "No Photos Yet", "value": "no", "icon": "✗"}
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "damage_check_photos", "operator": "equals", "value": "no"}],
            "nodeId": "damage_request_photos"
          },
          {
            "conditions": [{"field": "damage_check_photos", "operator": "equals", "value": "yes"}],
            "nodeId": "damage_upload_photos"
          }
        ]
      },
      {
        "id": "damage_request_photos",
        "type": "info",
        "content": "Please ask the customer to send clear photos showing: 1) The damaged item, 2) The original packaging, 3) The shipping label if visible. Once you have the photos, you can attach them in the next step.",
        "nextNodeId": "damage_upload_photos",
        "metadata": {
          "helpText": "Good photos help us file claims with carriers and communicate with the factory. Multiple angles are best.",
          "pauseReason": "awaiting_photos"
        }
      },
      {
        "id": "damage_upload_photos",
        "type": "attachment",
        "content": "Upload or attach the damage photos here (minimum 2 photos required):",
        "nextNodeId": "damage_warranty_status",
        "metadata": {
          "attachmentConfig": {
            "minFiles": 2,
            "maxFiles": 10,
            "acceptedTypes": ["image/*", "video/*"],
            "description": "Upload photos showing the damage from multiple angles"
          }
        }
      },
      {
        "id": "damage_warranty_status",
        "type": "info",
        "content": "Photos saved! The system has automatically checked the warranty status. You can see the coverage details in the customer sidebar.",
        "nextNodeId": "damage_decide_action"
      },
      {
        "id": "damage_decide_action",
        "type": "question",
        "content": "Based on the photos and warranty status, what action should we take?",
        "responseType": "single_choice",
        "options": [
          {
            "id": "factory_assessment",
            "label": "Send to Factory for Assessment",
            "value": "factory_assessment",
            "description": "Forward photos to factory for evaluation",
            "icon": "🏭"
          },
          {
            "id": "approve_replacement",
            "label": "Approve Free Replacement",
            "value": "approve_replacement",
            "description": "Clear damage within warranty period",
            "icon": "✓"
          },
          {
            "id": "customer_caused",
            "label": "Customer Caused Damage",
            "value": "customer_caused",
            "description": "Damage not covered by warranty",
            "icon": "⚠️"
          },
          {
            "id": "outside_warranty",
            "label": "Outside Warranty Period",
            "value": "outside_warranty",
            "description": "Offer paid replacement option",
            "icon": "⏰"
          }
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "damage_decide_action", "operator": "equals", "value": "factory_assessment"}],
            "nodeId": "damage_factory_assessment"
          },
          {
            "conditions": [{"field": "damage_decide_action", "operator": "equals", "value": "approve_replacement"}],
            "nodeId": "damage_approve_replacement"
          },
          {
            "conditions": [{"field": "damage_decide_action", "operator": "equals", "value": "customer_caused"}],
            "nodeId": "damage_customer_caused"
          },
          {
            "conditions": [{"field": "damage_decide_action", "operator": "equals", "value": "outside_warranty"}],
            "nodeId": "damage_outside_warranty"
          }
        ]
      },
      {
        "id": "damage_factory_assessment",
        "type": "info",
        "content": "You can now download the photos and send them to the factory for evaluation. The photos are saved in the thread and can be accessed anytime. Factory typically responds within 24-48 hours.",
        "nextNodeId": "damage_completion",
        "metadata": {
          "helpText": "Your fulfillment team knows how to communicate with the factory. Just provide them with the photos from this thread.",
          "pauseReason": "awaiting_factory_response"
        }
      },
      {
        "id": "damage_approve_replacement",
        "type": "info",
        "content": "Perfect! Since the damage is clearly covered and within warranty, you can proceed with sending a free replacement. Generate a return WEN for the damaged item if needed.",
        "nextNodeId": "damage_completion",
        "metadata": {
          "templateSuggestions": ["damage_replacement_approved", "replacement_shipment"]
        }
      },
      {
        "id": "damage_customer_caused",
        "type": "info",
        "content": "Customer-caused damage is not covered under warranty. You can explain this politely and offer a discounted replacement if appropriate for customer retention.",
        "nextNodeId": "damage_completion",
        "metadata": {
          "templateSuggestions": ["damage_not_covered", "discount_replacement_offer"]
        }
      },
      {
        "id": "damage_outside_warranty",
        "type": "info",
        "content": "This order is outside the warranty period. Explain this to the customer and offer a paid replacement or discounted option as a goodwill gesture if appropriate.",
        "nextNodeId": "damage_completion",
        "metadata": {
          "templateSuggestions": ["warranty_expired", "paid_replacement_offer"]
        }
      },
      {
        "id": "damage_completion",
        "type": "completion",
        "content": "All set! You have the photos saved and a clear action plan. Use the suggested email templates below to communicate with your customer.",
        "metadata": {
          "templateSuggestions": ["damage_resolution", "next_steps"]
        }
      }
    ],
    "metadata": {
      "estimatedTime": 180,
      "category": "damage",
      "tags": ["customer_service", "quality", "warranty", "photos"]
    }
  }'::jsonb,
  version = 2,
  updated_at = now()
WHERE category = 'damage' AND name = 'Damage Report Handler';
