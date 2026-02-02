/*
  # Complete Damage Flow with Product Selection and Real Warranty Data

  ## Changes
  - Add product selection step for multi-product orders
  - Auto-fetch warranty data from the specific product
  - Display warranty status inline (no sidebar references)
  - Route logic based on warranty + damage type

  ## Flow Logic
  1. Check if photos received
  2. Upload photos
  3. Check if order has multiple products
     - If YES → Ask which product (show product list)
     - If NO → Auto-select single product
  4. Fetch and display warranty status for that product
  5. Assess damage type
  6. Route based on damage + warranty
*/

UPDATE bot_flows
SET
  flow_definition = '{
    "id": "damage_flow_v5",
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
        "content": "Please ask the customer to send clear photos showing:\\n\\n1️⃣ The damaged item from multiple angles\\n2️⃣ The original packaging\\n3️⃣ The shipping label if visible\\n\\nOnce received, attach them in the next step.",
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
        "nextNodeId": "damage_product_check",
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
        "id": "damage_product_check",
        "type": "info",
        "content": "✓ Photos saved! Now checking which product this is about...",
        "nextNodeId": "damage_warranty_display",
        "metadata": {
          "action": "check_product_selection",
          "helpText": "For orders with multiple products, we need to know which one is damaged to check the correct warranty."
        }
      },
      {
        "id": "damage_warranty_display",
        "type": "info",
        "content": "[LOADING WARRANTY DATA...]",
        "nextNodeId": "damage_assessment",
        "metadata": {
          "dynamicContent": true,
          "contentSource": "product_warranty",
          "helpText": "Warranty info is pulled from the product configuration and order delivery date."
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
            "description": "Damaged during shipping"
          },
          {
            "id": "manufacturing_defect",
            "label": "🏭 Manufacturing Defect",
            "value": "manufacturing_defect",
            "description": "Factory issue"
          },
          {
            "id": "customer_caused",
            "label": "⚠️ Customer Caused",
            "value": "customer_caused",
            "description": "User damage"
          },
          {
            "id": "unclear",
            "label": "❓ Unclear - Need Factory Review",
            "value": "unclear",
            "description": "Send to factory"
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
        "content": "✓ This damage is covered. Based on the warranty status shown above:\\n\\n**If IN WARRANTY** → Approve free replacement immediately\\n**If EXPIRED** → Contact factory with photos (they may still cover manufacturing defects)",
        "nextNodeId": "damage_resolution_path"
      },
      {
        "id": "damage_resolution_path",
        "type": "question",
        "content": "What''s the next step based on the warranty status above?",
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
            "description": "Factory may still cover defects"
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
        "content": "Perfect! Approve the free replacement and generate a WEN if you need the damaged item returned. Use the email templates to notify the customer.",
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
        "content": "Customer-caused damage is not covered under warranty. Politely explain this to the customer and optionally offer a discounted replacement as a goodwill gesture.",
        "nextNodeId": "damage_completion",
        "metadata": {
          "templateSuggestions": ["damage_not_covered", "discount_replacement_offer"],
          "nextSteps": ["Explain warranty terms", "Offer paid replacement", "Provide discount code"]
        }
      },
      {
        "id": "damage_factory_review",
        "type": "info",
        "content": "The damage isn''t clearly covered or customer-caused. Forward the photos to factory for professional assessment. They''ll determine coverage within 24-48 hours.",
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
        "content": "✓ All set! Photos are saved in this thread and you have a clear action plan. Use the suggested email templates to communicate with your customer.",
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
  version = 5,
  updated_at = now()
WHERE category = 'damage' AND name = 'Damage Report Handler';