/*
  # Fix Damage Flow Logic

  ## Issues Fixed
  1. Remove manual warranty selection (system auto-detects from delivery date)
  2. Remove "Send to Factory" option (photos are sufficient, no physical return)
  3. Simplify admin decision to just: Is damage covered or customer-caused?
  4. System automatically routes based on warranty status + damage assessment

  ## New Flow Logic
  - Admin only decides: Covered damage vs Customer-caused
  - System checks warranty status automatically
  - If covered + in warranty → Free replacement
  - If covered + out of warranty → Factory decides or paid replacement
  - If customer-caused → Not covered regardless of warranty
*/

UPDATE bot_flows
SET
  flow_definition = '{
    "id": "damage_flow_v3",
    "startNodeId": "damage_intro",
    "nodes": [
      {
        "id": "damage_intro",
        "type": "info",
        "content": "I''ll help you handle this damage claim. Let''s collect photos and determine the best resolution.",
        "nextNodeId": "damage_check_photos"
      },
      {
        "id": "damage_check_photos",
        "type": "question",
        "content": "Has the customer sent damage photos?",
        "responseType": "single_choice",
        "options": [
          {"id": "yes", "label": "✓ Yes, Photos Received", "value": "yes"},
          {"id": "no", "label": "✗ No Photos Yet", "value": "no"}
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
        "content": "Please ask the customer to send clear photos showing: 1) The damaged item from multiple angles, 2) The original packaging, 3) The shipping label if visible. Once received, attach them in the next step.",
        "nextNodeId": "damage_upload_photos",
        "metadata": {
          "helpText": "Good photos help us file claims with carriers and communicate with the factory. Multiple angles are best.",
          "pauseReason": "awaiting_photos"
        }
      },
      {
        "id": "damage_upload_photos",
        "type": "attachment",
        "content": "📸 Upload the damage photos here (minimum 2 photos required):",
        "nextNodeId": "damage_warranty_check",
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
        "id": "damage_warranty_check",
        "type": "info",
        "content": "✓ Photos saved! Check the customer sidebar to see the automatic warranty status. The system has calculated coverage based on the delivery date.",
        "nextNodeId": "damage_assessment",
        "metadata": {
          "helpText": "Warranty status is shown in the sidebar with days remaining or days expired."
        }
      },
      {
        "id": "damage_assessment",
        "type": "question",
        "content": "Based on the photos, what type of damage is this?",
        "responseType": "single_choice",
        "options": [
          {
            "id": "shipping_damage",
            "label": "📦 Shipping/Transit Damage",
            "value": "shipping_damage",
            "description": "Damaged during shipping - covered"
          },
          {
            "id": "manufacturing_defect",
            "label": "🏭 Manufacturing Defect",
            "value": "manufacturing_defect",
            "description": "Factory issue - covered"
          },
          {
            "id": "customer_caused",
            "label": "⚠️ Customer Caused",
            "value": "customer_caused",
            "description": "User damage - not covered"
          },
          {
            "id": "unclear",
            "label": "❓ Unclear - Need Factory Review",
            "value": "unclear",
            "description": "Send photos to factory for assessment"
          }
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "damage_assessment", "operator": "equals", "value": "shipping_damage"}],
            "nodeId": "damage_covered"
          },
          {
            "conditions": [{"field": "damage_assessment", "operator": "equals", "value": "manufacturing_defect"}],
            "nodeId": "damage_covered"
          },
          {
            "conditions": [{"field": "damage_assessment", "operator": "equals", "value": "customer_caused"}],
            "nodeId": "damage_not_covered"
          },
          {
            "conditions": [{"field": "damage_assessment", "operator": "equals", "value": "unclear"}],
            "nodeId": "damage_factory_review"
          }
        ]
      },
      {
        "id": "damage_covered",
        "type": "info",
        "content": "✓ This damage is covered. Check the warranty status in the sidebar: If IN WARRANTY → Approve free replacement. If EXPIRED → Contact factory with photos to determine if they''ll cover it.",
        "nextNodeId": "damage_resolution_path"
      },
      {
        "id": "damage_resolution_path",
        "type": "question",
        "content": "What''s the next step based on warranty status?",
        "responseType": "single_choice",
        "options": [
          {
            "id": "free_replacement",
            "label": "✓ Free Replacement (In Warranty)",
            "value": "free_replacement"
          },
          {
            "id": "factory_coverage",
            "label": "🏭 Forward to Factory (Warranty Expired)",
            "value": "factory_coverage",
            "description": "Factory may still cover manufacturing defects"
          }
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "damage_resolution_path", "operator": "equals", "value": "free_replacement"}],
            "nodeId": "damage_free_replacement"
          },
          {
            "conditions": [{"field": "damage_resolution_path", "operator": "equals", "value": "factory_coverage"}],
            "nodeId": "damage_factory_expired_warranty"
          }
        ]
      },
      {
        "id": "damage_free_replacement",
        "type": "info",
        "content": "Perfect! Approve the free replacement and generate a WEN if you need the damaged item returned. Use the email templates below to notify the customer.",
        "nextNodeId": "damage_completion",
        "metadata": {
          "templateSuggestions": ["damage_replacement_approved", "replacement_shipment"],
          "nextSteps": ["Generate replacement order", "Create return WEN if needed", "Update customer"]
        }
      },
      {
        "id": "damage_factory_expired_warranty",
        "type": "info",
        "content": "Forward the photos to your factory contact (photos are saved in this thread). Factory typically responds within 24-48 hours on whether they''ll cover the damage despite expired warranty.",
        "nextNodeId": "damage_completion",
        "metadata": {
          "helpText": "Your fulfillment team knows the factory contact. Just share the photos from this thread.",
          "pauseReason": "awaiting_factory_decision",
          "templateSuggestions": ["factory_review_pending"]
        }
      },
      {
        "id": "damage_not_covered",
        "type": "info",
        "content": "Customer-caused damage is not covered under warranty. Politely explain this to the customer and optionally offer a discounted replacement as a goodwill gesture for customer retention.",
        "nextNodeId": "damage_completion",
        "metadata": {
          "templateSuggestions": ["damage_not_covered", "discount_replacement_offer"],
          "nextSteps": ["Explain warranty terms", "Offer paid replacement option", "Provide discount code if appropriate"]
        }
      },
      {
        "id": "damage_factory_review",
        "type": "info",
        "content": "The damage isn''t clearly covered or customer-caused. Forward the photos to factory for professional assessment. They''ll determine coverage and next steps within 24-48 hours.",
        "nextNodeId": "damage_completion",
        "metadata": {
          "helpText": "Save the photos from this thread and forward to your factory contact via your usual channel.",
          "pauseReason": "awaiting_factory_assessment",
          "templateSuggestions": ["damage_under_review", "assessment_pending"]
        }
      },
      {
        "id": "damage_completion",
        "type": "completion",
        "content": "✓ All set! Photos are saved in this thread and you have a clear action plan. Use the suggested email templates below to communicate with your customer.",
        "metadata": {
          "nextSteps": ["Download photos if needed", "Use email templates", "Update order status"]
        }
      }
    ],
    "metadata": {
      "estimatedTime": 180,
      "category": "damage",
      "tags": ["customer_service", "quality", "warranty", "photos"]
    }
  }'::jsonb,
  version = 3,
  updated_at = now()
WHERE category = 'damage' AND name = 'Damage Report Handler';