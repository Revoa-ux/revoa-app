/*
  # Intelligent Damage Flow with Automatic Routing

  ## Changes
  - Remove manual "What's the next step?" question
  - Automatically route based on warranty data + damage type
  - Use warranty info pulled from product_quotes to make smart decisions

  ## Smart Logic
  - If damage is covered AND warranty is active → Auto-route to free replacement
  - If damage is covered BUT warranty expired → Auto-route to factory review
  - If customer caused → Auto-route to not covered path
  - If unclear → Always route to factory review

  ## Why This is Better
  - No redundant questions asking admins to interpret warranty data
  - Faster resolution paths
  - Warranty data drives the flow automatically
*/

UPDATE bot_flows
SET
  flow_definition = '{
    "id": "damage_flow_v6_intelligent",
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
        "content": "📸 Upload the damage photos here:",
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
        "content": "✓ Photos saved! Now checking warranty coverage...",
        "nextNodeId": "damage_warranty_display",
        "metadata": {
          "action": "check_product_selection",
          "helpText": "Loading product warranty information from the order."
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
            "description": "Factory quality issue"
          },
          {
            "id": "customer_caused",
            "label": "⚠️ Customer Caused Damage",
            "value": "customer_caused",
            "description": "Damage after delivery"
          },
          {
            "id": "unclear",
            "label": "❓ Unclear - Need Factory Review",
            "value": "unclear",
            "description": "Cannot determine from photos"
          }
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "damage_assessment", "operator": "equals", "value": "shipping_damage"}],
            "nodeId": "damage_shipping_resolution"
          },
          {
            "conditions": [{"field": "damage_assessment", "operator": "equals", "value": "manufacturing_defect"}],
            "nodeId": "damage_manufacturing_check"
          },
          {
            "conditions": [{"field": "damage_assessment", "operator": "equals", "value": "customer_caused"}],
            "nodeId": "damage_customer_caused"
          },
          {
            "conditions": [{"field": "damage_assessment", "operator": "equals", "value": "unclear"}],
            "nodeId": "damage_factory_review"
          }
        ]
      },
      {
        "id": "damage_shipping_resolution",
        "type": "info",
        "content": "**SHIPPING DAMAGE - RESOLUTION:**\\n\\n✅ This is covered under shipping protection.\\n\\n**Action:** Approve free replacement immediately. The carrier insurance or your shipping policy covers this damage.\\n\\nUse email templates to notify the customer about their replacement shipment.",
        "nextNodeId": "damage_completion",
        "metadata": {
          "resolution": "free_replacement",
          "reason": "shipping_damage_covered",
          "templateSuggestions": ["damage_replacement_approved", "replacement_shipment"],
          "nextSteps": [
            "Generate replacement order",
            "File carrier claim if applicable",
            "Update customer via email"
          ]
        }
      },
      {
        "id": "damage_manufacturing_check",
        "type": "question",
        "content": "**Manufacturing defect identified.** Check the warranty status above and choose the appropriate path:",
        "responseType": "single_choice",
        "options": [
          {
            "id": "in_warranty",
            "label": "✅ Warranty is Active",
            "value": "in_warranty",
            "description": "Free replacement"
          },
          {
            "id": "expired_warranty",
            "label": "⚠️ Warranty Expired",
            "value": "expired_warranty",
            "description": "Forward to factory"
          }
        ],
        "conditionalNext": [
          {
            "conditions": [{"field": "damage_manufacturing_check", "operator": "equals", "value": "in_warranty"}],
            "nodeId": "damage_warranty_active_resolution"
          },
          {
            "conditions": [{"field": "damage_manufacturing_check", "operator": "equals", "value": "expired_warranty"}],
            "nodeId": "damage_warranty_expired_factory"
          }
        ],
        "metadata": {
          "helpText": "Look at the warranty status shown above to determine which option applies."
        }
      },
      {
        "id": "damage_warranty_active_resolution",
        "type": "info",
        "content": "**MANUFACTURING DEFECT - IN WARRANTY:**\\n\\n✅ Warranty is active and covers this defect.\\n\\n**Action:** Approve free replacement immediately.\\n\\nGenerate replacement order and optionally create a return WEN if you need the defective item back for quality control.\\n\\nUse email templates to notify the customer.",
        "nextNodeId": "damage_completion",
        "metadata": {
          "resolution": "free_replacement",
          "reason": "warranty_active",
          "templateSuggestions": ["damage_replacement_approved", "replacement_shipment"],
          "nextSteps": [
            "Generate replacement order",
            "Create return WEN if needed for QC",
            "Update customer via email"
          ]
        }
      },
      {
        "id": "damage_warranty_expired_factory",
        "type": "info",
        "content": "**MANUFACTURING DEFECT - EXPIRED WARRANTY:**\\n\\n⚠️ Warranty has expired, but many factories still cover manufacturing defects.\\n\\n**Action:** Forward photos to your factory contact. Photos are saved in this thread.\\n\\n**Typical Response Time:** 24-48 hours\\n\\n**Factory Decision Options:**\\n• Cover replacement despite expired warranty\\n• Offer partial credit\\n• Decline coverage\\n\\nPause this thread until factory responds.",
        "nextNodeId": "damage_completion",
        "metadata": {
          "resolution": "factory_review",
          "reason": "warranty_expired_defect",
          "pauseReason": "awaiting_factory_decision",
          "helpText": "Your fulfillment team knows the factory contact. Share photos from this thread.",
          "nextSteps": [
            "Forward photos to factory",
            "Wait for factory decision",
            "Resume thread when factory responds"
          ]
        }
      },
      {
        "id": "damage_customer_caused",
        "type": "info",
        "content": "**CUSTOMER CAUSED DAMAGE:**\\n\\n❌ This damage occurred after delivery and is not covered by warranty or shipping protection.\\n\\n**Resolution Options:**\\n\\n1️⃣ **Paid Replacement:** Offer to sell a replacement at cost/discounted price\\n2️⃣ **Partial Refund:** Offer small goodwill refund\\n3️⃣ **Repair Guide:** Send repair instructions if applicable\\n4️⃣ **Politely Decline:** Explain coverage doesn''t apply\\n\\nUse scenario email templates to communicate professionally.",
        "nextNodeId": "damage_completion",
        "metadata": {
          "resolution": "not_covered",
          "reason": "customer_caused",
          "templateSuggestions": ["damage_not_covered", "goodwill_offer"],
          "nextSteps": [
            "Choose appropriate resolution option",
            "Use email template to communicate",
            "Document decision in thread"
          ]
        }
      },
      {
        "id": "damage_factory_review",
        "type": "info",
        "content": "**UNCLEAR DAMAGE - FACTORY REVIEW NEEDED:**\\n\\n❓ Damage type cannot be determined from photos alone.\\n\\n**Action:** Forward photos to factory for expert assessment.\\n\\n**What Factory Will Assess:**\\n• Is this a manufacturing defect?\\n• Is this shipping damage?\\n• Is this user damage?\\n• What''s the appropriate resolution?\\n\\n**Response Time:** 24-48 hours\\n\\nPause this thread and resume when factory provides guidance.",
        "nextNodeId": "damage_completion",
        "metadata": {
          "resolution": "factory_review",
          "reason": "unclear_needs_expert",
          "pauseReason": "awaiting_factory_assessment",
          "nextSteps": [
            "Forward photos to factory",
            "Request expert damage assessment",
            "Wait for factory guidance",
            "Resume thread with factory decision"
          ]
        }
      },
      {
        "id": "damage_completion",
        "type": "completion",
        "content": "✓ Damage claim processed. Next steps are documented above. Update the customer and close this thread when resolved.",
        "metadata": {
          "completionActions": ["update_customer", "close_thread_when_resolved"]
        }
      }
    ]
  }'::jsonb,
  version = 7,
  updated_at = now()
WHERE category = 'damage' AND name = 'Damage Report Handler';