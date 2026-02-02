/*
  # Update Defective Product and Wrong Item Flows with Photo Upload + Admin Review

  1. Changes
    - Defective Product Handler: Add photo/video upload step, admin reviews before proceeding
    - Wrong Item Handler: Add photo upload step, admin reviews evidence  
    - Fix messaging to clarify AGENT handles factory communication (not merchant)
    - Flow pauses after photo upload for admin to review and accept/reject evidence

  2. Flow Changes
    - Both flows now require photo evidence before resolution
    - Admin review step ensures evidence is legitimate
    - Clear messaging that agent coordinates with factory
*/

-- Update Defective Product Handler with photo upload and admin review
UPDATE bot_flows
SET flow_definition = '{
  "id": "defective_flow_v3_with_photo_review",
  "startNodeId": "defective_intro",
  "nodes": [
    {
      "id": "defective_intro",
      "type": "info",
      "content": "I''ll help you handle this defective product claim. Let''s collect evidence and check warranty coverage.",
      "nextNodeId": "defective_warranty_check"
    },
    {
      "id": "defective_warranty_check",
      "type": "info",
      "content": "Checking warranty coverage...",
      "metadata": {
        "autoAdvance": false,
        "contentSource": "product_warranty",
        "dynamicContent": true
      },
      "nextNodeId": "defective_has_evidence"
    },
    {
      "id": "defective_has_evidence",
      "type": "question",
      "content": "Has the customer sent photos or video of the defect?",
      "responseType": "single_choice",
      "options": [
        {"id": "yes", "label": "Yes, Evidence Received", "value": "yes"},
        {"id": "no", "label": "No, Need to Request", "value": "no"}
      ],
      "conditionalNext": [
        {"nodeId": "defective_request_evidence", "conditions": [{"field": "defective_has_evidence", "value": "no", "operator": "equals"}]},
        {"nodeId": "defective_upload_evidence", "conditions": [{"field": "defective_has_evidence", "value": "yes", "operator": "equals"}]}
      ]
    },
    {
      "id": "defective_request_evidence",
      "type": "info",
      "content": "Ask the customer to send:\n\n1. Clear photos showing the defect\n2. A short video demonstrating the issue (if applicable)\n3. Photo of the product label/packaging\n\nThis evidence helps your agent verify the claim and coordinate with the factory.",
      "metadata": {
        "helpText": "Good evidence speeds up resolution. Video is especially helpful for functional defects.",
        "pauseReason": "awaiting_customer_evidence"
      },
      "nextNodeId": "defective_upload_evidence"
    },
    {
      "id": "defective_upload_evidence",
      "type": "attachment",
      "content": "Upload the defect photos/video here:",
      "metadata": {
        "attachmentConfig": {
          "minFiles": 1,
          "maxFiles": 10,
          "acceptedTypes": ["image/*", "video/*"],
          "description": "Upload photos or video showing the defect clearly"
        }
      },
      "nextNodeId": "defective_admin_review"
    },
    {
      "id": "defective_admin_review",
      "type": "info",
      "content": "Evidence submitted! Your agent will review the photos/video to verify the defect claim.\n\nThey''ll check:\n• Is the defect clearly visible?\n• Does it match our product/packaging?\n• Is it a manufacturing issue vs. user damage?\n\nYou''ll receive an update once reviewed.",
      "metadata": {
        "requiresAgentAction": true,
        "escalationType": "review_defect_evidence",
        "escalationMessage": "Your agent is reviewing the defect evidence and will get back to you shortly",
        "adminActionMessage": "Review defect evidence - verify claim is legitimate before contacting factory",
        "pauseReason": "awaiting_admin_review",
        "helpText": "The admin will review the uploaded evidence. If approved, they will coordinate with the factory. If rejected, they will explain why more evidence is needed."
      },
      "nextNodeId": "defective_completion"
    },
    {
      "id": "defective_completion",
      "type": "completion",
      "content": "Got it! Send the customer this email:",
      "metadata": {
        "templateSuggestions": ["defect_claim_filed", "defect_replacement", "defect_under_review"]
      }
    }
  ]
}'::jsonb
WHERE name = 'Defective Product Handler' AND is_active = true;

-- Update Wrong Item Handler with photo upload and admin review
UPDATE bot_flows
SET flow_definition = '{
  "id": "wrong_item_flow_v2_with_photo_review",
  "startNodeId": "wrong_intro",
  "nodes": [
    {
      "id": "wrong_intro",
      "type": "info",
      "content": "I''ll help you resolve this wrong item situation. Let''s verify the claim with photos first.",
      "nextNodeId": "wrong_has_evidence"
    },
    {
      "id": "wrong_has_evidence",
      "type": "question",
      "content": "Has the customer sent photos showing what they received?",
      "responseType": "single_choice",
      "options": [
        {"id": "yes", "label": "Yes, Photos Received", "value": "yes"},
        {"id": "no", "label": "No, Need to Request", "value": "no"}
      ],
      "conditionalNext": [
        {"nodeId": "wrong_request_photos", "conditions": [{"field": "wrong_has_evidence", "value": "no", "operator": "equals"}]},
        {"nodeId": "wrong_upload_evidence", "conditions": [{"field": "wrong_has_evidence", "value": "yes", "operator": "equals"}]}
      ]
    },
    {
      "id": "wrong_request_photos",
      "type": "info",
      "content": "Ask the customer to send:\n\n1. Photo of the item they received\n2. Photo of the item label/packaging\n3. Photo of the shipping label (if visible)\n\nThis helps your agent verify it''s our packaging and process the correction quickly.",
      "metadata": {
        "helpText": "Photos of the label and packaging confirm it shipped from our warehouse.",
        "pauseReason": "awaiting_customer_evidence"
      },
      "nextNodeId": "wrong_upload_evidence"
    },
    {
      "id": "wrong_upload_evidence",
      "type": "attachment",
      "content": "Upload the wrong item photos here:",
      "metadata": {
        "attachmentConfig": {
          "minFiles": 1,
          "maxFiles": 10,
          "acceptedTypes": ["image/*"],
          "description": "Upload photos showing the wrong item received"
        }
      },
      "nextNodeId": "wrong_admin_review"
    },
    {
      "id": "wrong_admin_review",
      "type": "info",
      "content": "Evidence submitted! Your agent will review the photos to verify this is our error.\n\nThey''ll check:\n• Is it our packaging/label?\n• What item was actually sent?\n• What was the customer supposed to receive?\n\nOnce verified, they''ll arrange the correct shipment.",
      "metadata": {
        "requiresAgentAction": true,
        "escalationType": "review_wrong_item_evidence",
        "escalationMessage": "Your agent is reviewing the wrong item evidence and will arrange the correction",
        "adminActionMessage": "Review wrong item photos - verify our error before shipping replacement",
        "pauseReason": "awaiting_admin_review",
        "helpText": "The admin will verify this is our shipping error by checking the packaging and labels. If confirmed, they will ship the correct item."
      },
      "nextNodeId": "wrong_completion"
    },
    {
      "id": "wrong_completion",
      "type": "completion",
      "content": "Got it! Send the customer this email:",
      "metadata": {
        "templateSuggestions": ["wrong_item_apology", "correct_item_shipped", "return_label_provided"]
      }
    }
  ]
}'::jsonb
WHERE name = 'Wrong Item Handler' AND is_active = true;