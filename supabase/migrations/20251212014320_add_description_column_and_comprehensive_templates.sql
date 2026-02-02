/*
  # Complete Template System Overhaul
  
  1. Schema Changes
    - Add `description` column to email_templates table
    - Description explains "when to use" each template
  
  2. Category Expansion  
    - Expand category constraint to include all template categories:
      - order_status, address_issue, cancel, upsell, refund, chargeback, quality, delivery_exception
  
  3. Template Updates
    - Update existing templates with descriptions
    - Add 9 missing templates from hardcoded array
    - Update all signatures to use "{{merchant_name}} with {{merchant_store_name}}" format
  
  4. Problem-Type Categories
    - Order Status / Inquiries (earliest stage)
    - Address Problems (before shipping)  
    - Shipping & Delivery (in transit)
    - Delivery Issues / Exceptions
    - Returns & Exchanges
    - Product Issues (damaged/defective)
    - Refunds
    - Chargebacks (most escalated)
*/

-- Add description column
ALTER TABLE email_templates
ADD COLUMN IF NOT EXISTS description TEXT;

-- Drop existing category constraint and recreate with expanded values
ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_category_check;
ALTER TABLE email_templates ADD CONSTRAINT email_templates_category_check 
  CHECK (category IN (
    'replacement',
    'damaged', 
    'return',
    'defective',
    'shipping',
    'confirmation',
    'quote_followup',
    'inquiry',
    'thankyou',
    'order_status',
    'address_issue',
    'cancel',
    'upsell',
    'refund',
    'chargeback',
    'quality',
    'delivery_exception'
  ));

-- Clear existing templates to rebuild with consistent data
DELETE FROM email_templates;

-- =====================================================
-- PRODUCT ISSUES - Defective/Damaged/Quality
-- =====================================================
INSERT INTO email_templates (name, category, description, subject_line, body_html, body_plain, badges, order_status_hints, sort_order) VALUES
('Damaged Item Evidence Request', 'damaged', 'Request photos/video of damage before offering resolution', 
'Regarding Your Order {{order_number}}',
'<p>Hello {{customer_first_name}},</p><p>We sincerely apologize for any inconvenience. While we do our best to ensure every order arrives in perfect condition, shipping and handling factors outside our control can sometimes cause issues.</p><p>To help us resolve this quickly, could you please send us clear photos or a short video showing the damaged item(s)? This will help our team assess the situation and determine the best solution for you.</p><p>Once we receive your photos/video, we''ll get back to you right away with next steps.</p><p>Thank you for your patience and understanding.</p><p>Best regards,<br>{{merchant_name}} with {{merchant_store_name}}</p>',
'Hello {{customer_first_name}},

We sincerely apologize for any inconvenience. While we do our best to ensure every order arrives in perfect condition, shipping and handling factors outside our control can sometimes cause issues.

To help us resolve this quickly, could you please send us clear photos or a short video showing the damaged item(s)? This will help our team assess the situation and determine the best solution for you.

Once we receive your photos/video, we''ll get back to you right away with next steps.

Thank you for your patience and understanding.

Best regards,
{{merchant_name}} with {{merchant_store_name}}',
ARRAY['Need Reason', 'Warranty Issue'],
ARRAY['shipped', 'delivered'],
1),

('Defective Product Resolution', 'defective', 'Prioritize replacement over refund for defective items',
'Resolution for Your Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>We sincerely apologize for the issue with your item from order #{{order_number}}. This definitely isn''t the experience we want for our customers.</p><p>We''d like to make this right. Here are your options:</p><p><strong>Option 1: Free Replacement (Recommended)</strong><br>We''ll send you a brand new replacement at no additional cost. This is typically the fastest way to get you the product you ordered.</p><p><strong>Option 2: Return for Refund</strong><br>If you prefer, we can process a return. Please note this would require shipping the item back to our warehouse, and a restocking fee may apply per our return policy.</p><p>We''re here to help make this right. Which option works best for you?</p><p>Best regards,<br>{{merchant_name}} with {{merchant_store_name}}</p>',
'Hi {{customer_first_name}},

We sincerely apologize for the issue with your item from order #{{order_number}}. This definitely isn''t the experience we want for our customers.

We''d like to make this right. Here are your options:

Option 1: Free Replacement (Recommended)
We''ll send you a brand new replacement at no additional cost. This is typically the fastest way to get you the product you ordered.

Option 2: Return for Refund
If you prefer, we can process a return. Please note this would require shipping the item back to our warehouse, and a restocking fee may apply per our return policy.

We''re here to help make this right. Which option works best for you?

Best regards,
{{merchant_name}} with {{merchant_store_name}}',
ARRAY['Warranty Issue', 'Need Reason'],
ARRAY['shipped', 'delivered'],
2),

('Quality Concern Troubleshooting', 'quality', 'Guide customer through troubleshooting before offering replacement',
'About Your Product Quality Concern',
'<p>Hey {{customer_first_name}},</p><p>Thanks for reaching out about your concerns with the product. I completely understand and I''m here to help.</p><p>Before we proceed, let''s try a few quick troubleshooting steps to make sure everything is working as intended:</p><ol><li>Please verify the product has been set up according to the instructions</li><li>Check that all connections/components are properly secured</li><li>Try the product in different conditions or settings if applicable</li></ol><p>If after following these steps you''re still experiencing issues, please send us photos or a short video showing the concern. This will help us better understand what''s happening and determine the best solution.</p><p>We''re committed to making sure you''re completely satisfied with your purchase.</p><p>Let me know what you find!</p><p>Best regards,<br>{{merchant_name}} with {{merchant_store_name}}</p>',
'Hey {{customer_first_name}},

Thanks for reaching out about your concerns with the product. I completely understand and I''m here to help.

Before we proceed, let''s try a few quick troubleshooting steps to make sure everything is working as intended:

1. Please verify the product has been set up according to the instructions
2. Check that all connections/components are properly secured
3. Try the product in different conditions or settings if applicable

If after following these steps you''re still experiencing issues, please send us photos or a short video showing the concern. This will help us better understand what''s happening and determine the best solution.

We''re committed to making sure you''re completely satisfied with your purchase.

Let me know what you find!

Best regards,
{{merchant_name}} with {{merchant_store_name}}',
ARRAY['Need Reason'],
ARRAY['shipped', 'delivered'],
3);

-- =====================================================
-- RETURNS & EXCHANGES
-- =====================================================
INSERT INTO email_templates (name, category, description, subject_line, body_html, body_plain, badges, order_status_hints, action_required, sort_order) VALUES
('Return Inquiry', 'return', 'Understand reason and offer replacement before accepting return',
'About Your Return Request',
'<p>Hey {{customer_first_name}},</p><p>Thank you for reaching out. Before we proceed with a return, may I ask what issue you''re experiencing with the product?</p><p>If there''s a problem with the item itself, we''d be happy to send you a replacement at no cost - this is usually much faster than processing a return and refund.</p><p>If you''re simply not satisfied with the product and it''s unused in original packaging, we can discuss return options. Please note that sale items may have different return policies, and a restocking fee applies to most returns as outlined in our policy.</p><p>Let me know what''s going on and we''ll find the best solution for you!</p><p>Best regards,<br>{{merchant_name}} with {{merchant_store_name}}</p>',
'Hey {{customer_first_name}},

Thank you for reaching out. Before we proceed with a return, may I ask what issue you''re experiencing with the product?

If there''s a problem with the item itself, we''d be happy to send you a replacement at no cost - this is usually much faster than processing a return and refund.

If you''re simply not satisfied with the product and it''s unused in original packaging, we can discuss return options. Please note that sale items may have different return policies, and a restocking fee applies to most returns as outlined in our policy.

Let me know what''s going on and we''ll find the best solution for you!

Best regards,
{{merchant_name}} with {{merchant_store_name}}',
ARRAY['Need Reason'],
ARRAY['shipped', 'delivered'],
'need_reason',
10),

('Return Instructions', 'return', 'Provide complete return process with restocking fee',
'Return Instructions for Order {{order_number}}',
'<p>Hey {{customer_first_name}},</p><p>I understand you''d like to return your items. Here''s our return process:</p><p><strong>Important:</strong> Items must be unused, in original condition, and in original packaging. After inspection, if items are deemed resellable, you''ll receive a refund minus the {{restocking_fee}} restocking fee as stated in our return policy.</p><p><strong>RETURN STEPS:</strong></p><p><strong>Step 1: Confirm Items</strong><br>Reply to this email confirming exactly which items you''re returning.</p><p><strong>Step 2: Get Warehouse Entry Number</strong><br>Wait for our reply with your unique "Warehouse Entry Number" (WEN).</p><p><strong>Step 3: Ship to Warehouse</strong><br>Return address: {{return_warehouse_address}}<br><br><em>CRITICAL: Write your WEN clearly on the OUTSIDE of the package near the shipping label.</em></p><p><strong>Step 4: Include Documentation</strong><br>Place a note INSIDE the package with:<br>- Your full name<br>- Order number: {{order_number}}<br>- Product names<br>- Quantity<br><br>Returns without this info may be rejected.</p><p><strong>Step 5: Provide Tracking</strong><br>Once shipped, reply with your tracking number so our warehouse team can watch for it.</p><p><strong>Step 6: Inspection & Refund</strong><br>After inspection (5-7 business days), we''ll process your refund minus restocking fee if items are resellable.</p><p>Let me know when you''re ready to proceed!</p>',
'Hey {{customer_first_name}},

I understand you''d like to return your items. Here''s our return process:

Important: Items must be unused, in original condition, and in original packaging. After inspection, if items are deemed resellable, you''ll receive a refund minus the {{restocking_fee}} restocking fee as stated in our return policy.

RETURN STEPS:

Step 1: Confirm Items
Reply to this email confirming exactly which items you''re returning.

Step 2: Get Warehouse Entry Number
Wait for our reply with your unique "Warehouse Entry Number" (WEN).

Step 3: Ship to Warehouse
Return address: {{return_warehouse_address}}

CRITICAL: Write your WEN clearly on the OUTSIDE of the package near the shipping label.

Step 4: Include Documentation
Place a note INSIDE the package with:
- Your full name
- Order number: {{order_number}}
- Product names
- Quantity

Returns without this info may be rejected.

Step 5: Provide Tracking
Once shipped, reply with your tracking number so our warehouse team can watch for it.

Step 6: Inspection & Refund
After inspection (5-7 business days), we''ll process your refund minus restocking fee if items are resellable.

Let me know when you''re ready to proceed!',
ARRAY['Need WEN', 'Need Confirm'],
ARRAY['shipped', 'delivered'],
'need_confirm',
11),

('Return Approval', 'return', 'Give customer their WEN for approved return',
'Your Warehouse Entry Number - {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>Your return has been approved. Your Warehouse Entry Number (WEN) is:</p><p><strong>WEN: [INSERT WEN HERE]</strong></p><p><strong>IMPORTANT INSTRUCTIONS:</strong></p><ol><li>Write this WEN clearly on the OUTSIDE of your package near the shipping label</li><li>Ship to: {{return_warehouse_address}}</li><li>Include a note inside with:<br>- Your name<br>- Order number: {{order_number}}<br>- Product names<br>- Quantities</li><li>Reply with tracking number once shipped</li></ol><p>After our warehouse team inspects your return (5-7 business days after receipt), we''ll process your refund minus the {{restocking_fee}} restocking fee.</p><p>Let me know if you have any questions!</p>',
'Hi {{customer_first_name}},

Your return has been approved. Your Warehouse Entry Number (WEN) is:

**WEN: [INSERT WEN HERE]**

IMPORTANT INSTRUCTIONS:

1. Write this WEN clearly on the OUTSIDE of your package near the shipping label
2. Ship to: {{return_warehouse_address}}
3. Include a note inside with:
   - Your name
   - Order number: {{order_number}}
   - Product names
   - Quantities

4. Reply with tracking number once shipped

After our warehouse team inspects your return (5-7 business days after receipt), we''ll process your refund minus the {{restocking_fee}} restocking fee.

Let me know if you have any questions!',
ARRAY['Need WEN'],
ARRAY['shipped', 'delivered'],
NULL,
12);

-- =====================================================
-- ORDER STATUS
-- =====================================================
INSERT INTO email_templates (name, category, description, subject_line, body_html, body_plain, badges, order_status_hints, sort_order) VALUES
('Order Status: Not Shipped', 'order_status', 'Provide status for orders not yet shipped',
'Order {{order_number}} Status Update',
'<p>Hello {{customer_first_name}},</p><p>Thank you for reaching out! Your order {{order_number}} has been received and we are working on getting it shipped out.</p><p>Our processing time before an order ships is typically 1-3 days, excluding weekends.</p><p>We will email you a confirmation once it ships and that will include tracking information as well.</p><p>If you have any questions in the meantime, please don''t hesitate to reach out.</p>',
'Hello {{customer_first_name}},

Thank you for reaching out! Your order {{order_number}} has been received and we are working on getting it shipped out.

Our processing time before an order ships is typically 1-3 days, excluding weekends.

We will email you a confirmation once it ships and that will include tracking information as well.

If you have any questions in the meantime, please don''t hesitate to reach out.',
ARRAY['Not Shipped'],
ARRAY['pending', 'not_shipped'],
20),

('Order Status: Shipped', 'order_status', 'Provide tracking for shipped orders',
'Your Order #{{order_number}} Has Shipped!',
'<p>Hello {{customer_first_name}},</p><p>Thanks for reaching out! Your order has shipped and I''ve included the information below so you can track it right to your door.</p><p>Order: {{order_number}}<br>Order Status Page: {{order_status_url}}</p><p>P.s. You should be receiving email updates to the same email you made your order with.</p><p>Please advise, you may need to check your spam folder.</p><p>You can also use the tracking page on our website to check on your live delivery status at anytime:<br>{{tracking_url}}</p>',
'Hello {{customer_first_name}},

Thanks for reaching out! Your order has shipped and I''ve included the information below so you can track it right to your door.

Order: {{order_number}}
Order Status Page: {{order_status_url}}

P.s. You should be receiving email updates to the same email you made your order with.

Please advise, you may need to check your spam folder.

You can also use the tracking page on our website to check on your live delivery status at anytime:
{{tracking_url}}',
ARRAY['Shipped'],
ARRAY['shipped', 'in_transit'],
21),

('Order Status Follow-Up', 'order_status', 'Reassure customer about shipping delays',
'About Your Delivery',
'<p>{{customer_first_name}}, I checked in on your order delivery status and everything seems normal.</p><p>I understand you are excited and eager to receive your order and I wish I could give you an ETA.</p><p>It''s possible the delivery company is backed up, unfortunately it''s out of our control as they don''t work for us, they have millions of packages to process.</p><p>Please allow the delivery company to process your package and update their system. You will receive updates in real time via email and you can always check our tracking page to see the live status of your delivery.</p><p>Thanks again for your patience and understanding, if I could make it move faster I would.</p>',
'{{customer_first_name}}, I checked in on your order delivery status and everything seems normal.

I understand you are excited and eager to receive your order and I wish I could give you an ETA.

It''s possible the delivery company is backed up, unfortunately it''s out of our control as they don''t work for us, they have millions of packages to process.

Please allow the delivery company to process your package and update their system. You will receive updates in real time via email and you can always check our tracking page to see the live status of your delivery.

Thanks again for your patience and understanding, if I could make it move faster I would.',
ARRAY['Shipped', 'Follow Up'],
ARRAY['shipped', 'in_transit'],
22),

('Order Status: Out for Delivery', 'order_status', 'Notify customer package is out for delivery',
'Your Package is Out for Delivery!',
'<p>Hello {{customer_first_name}},</p><p>Thanks for reaching out! Your order is out for delivery, I''ll include the information below so you can track it right to your door.</p><p>You should be receiving email updates to the same email used during checkout from our system regarding delivery updates.</p><p>Please advise, you may need to check your spam folder.</p><p>You can track your order here on this page:<br>{{tracking_url}}</p>',
'Hello {{customer_first_name}},

Thanks for reaching out! Your order is out for delivery, I''ll include the information below so you can track it right to your door.

You should be receiving email updates to the same email used during checkout from our system regarding delivery updates.

Please advise, you may need to check your spam folder.

You can track your order here on this page:
{{tracking_url}}',
ARRAY['Out for Delivery'],
ARRAY['out_for_delivery'],
23);

-- =====================================================
-- DELIVERY EXCEPTIONS
-- =====================================================
INSERT INTO email_templates (name, category, description, subject_line, body_html, body_plain, badges, order_status_hints, sort_order) VALUES
('Delivery Status: Delivered Not Received', 'delivery_exception', 'Handle delivered but not received inquiries',
'About Your Delivery',
'<p>Hello {{customer_first_name}},</p><p>I am sorry to hear that you have not received your order yet. I checked your order and it shows that it has been delivered:</p><p>{{tracking_status}}<br>Tracking #: {{tracking_number}}</p><p>There are times that tracking shows delivered but it doesn''t get dropped off until the next day or so.</p><p>If you still haven''t received after 2 business days since the status changed to delivered, please coordinate with the USPS/AU POST/CA POST with the above tracking number.</p><p>In the meantime, please don''t hesitate to reach out if there is anything else we can help with.</p>',
'Hello {{customer_first_name}},

I am sorry to hear that you have not received your order yet. I checked your order and it shows that it has been delivered:

{{tracking_status}}
Tracking #: {{tracking_number}}

There are times that tracking shows delivered but it doesn''t get dropped off until the next day or so.

If you still haven''t received after 2 business days since the status changed to delivered, please coordinate with the USPS/AU POST/CA POST with the above tracking number.

In the meantime, please don''t hesitate to reach out if there is anything else we can help with.',
ARRAY['Delivered', 'Need Reason'],
ARRAY['delivered'],
30),

('Delivery Status: 2+ Days Not Located', 'delivery_exception', 'Handle packages marked delivered over 2 days ago',
'About Your Package',
'<p>Hello {{customer_first_name}},</p><p>We do not have access to customer information with USPS. So please call them if you have trouble locating your package. I checked your order information on our end and it shows that it has been delivered:</p><p>{{tracking_status}}</p><p>Tracking #: {{tracking_number}}</p><p>Please call USPS directly as soon as possible for more assistance.</p>',
'Hello {{customer_first_name}},

We do not have access to customer information with USPS. So please call them if you have trouble locating your package. I checked your order information on our end and it shows that it has been delivered:

{{tracking_status}}

Tracking #: {{tracking_number}}

Please call USPS directly as soon as possible for more assistance.',
ARRAY['Delivered', 'Delivery Exception'],
ARRAY['delivered'],
31),

('Package Returned to Warehouse', 'delivery_exception', 'Offer reshipment as primary option for returned packages',
'Your Package Was Returned to Us',
'<p>Hi {{customer_first_name}},</p><p>Our warehouse team has notified us that your package was returned by the carrier due to delivery issues.</p><p>We''d like to get this resolved for you right away. Here are your options:</p><p><strong>Option 1: Reship to You (Recommended)</strong><br>We can send your order out again at no additional cost. Please confirm:<br>- Your best shipping address<br>- A phone number (this helps the carrier contact you if needed)</p><p><strong>Option 2: Process Refund</strong><br>If you prefer, we can refund your order minus the {{restocking_fee}} restocking fee as outlined in our return policy, since the package has been returned to us.</p><p>The carrier attempted delivery multiple times and couldn''t complete it. For future orders, we highly recommend including a phone number so carriers can reach you directly.</p><p>Please let us know how you''d like to proceed!</p><p>Best regards,<br>{{merchant_name}} with {{merchant_store_name}}</p>',
'Hi {{customer_first_name}},

Our warehouse team has notified us that your package was returned by the carrier due to delivery issues.

We''d like to get this resolved for you right away. Here are your options:

Option 1: Reship to You (Recommended)
We can send your order out again at no additional cost. Please confirm:
- Your best shipping address
- A phone number (this helps the carrier contact you if needed)

Option 2: Process Refund
If you prefer, we can refund your order minus the {{restocking_fee}} restocking fee as outlined in our return policy, since the package has been returned to us.

The carrier attempted delivery multiple times and couldn''t complete it. For future orders, we highly recommend including a phone number so carriers can reach you directly.

Please let us know how you''d like to proceed!

Best regards,
{{merchant_name}} with {{merchant_store_name}}',
ARRAY['Returned to Sender', 'Delivery Exception'],
ARRAY['returned'],
32),

('Delivery Exception: Package Being Returned', 'delivery_exception', 'Handle packages being returned to sender',
'Your Package is Being Returned',
'<p>Hello {{customer_first_name}},</p><p>I am sorry to hear that your order has started returning to us. Can you please call USPS/CA POST/AU POST as they only speak to receivers of packages not the sender (for security purposes).</p><p>Your tracking #: {{tracking_number}}</p><p>They will be able to coordinate with you regarding reverse the return and potentially correcting the address. Perhaps they just needed to contact you and couldn''t at the time of delivery.</p><p>In the meantime, please don''t hesitate to reach out if there is anything else we can help with.</p><p>Let me know if they cannot reverse it and I will send your order again immediately.</p>',
'Hello {{customer_first_name}},

I am sorry to hear that your order has started returning to us. Can you please call USPS/CA POST/AU POST as they only speak to receivers of packages not the sender (for security purposes).

Your tracking #: {{tracking_number}}

They will be able to coordinate with you regarding reverse the return and potentially correcting the address. Perhaps they just needed to contact you and couldn''t at the time of delivery.

In the meantime, please don''t hesitate to reach out if there is anything else we can help with.

Let me know if they cannot reverse it and I will send your order again immediately.',
ARRAY['Returned to Sender', 'Delivery Exception'],
ARRAY['returned', 'shipped'],
33),

('Invalid Address Exception', 'delivery_exception', 'Package returned due to address error, offer reship',
'Address Issue - Order {{order_number}}',
'<p>Hey {{customer_first_name}},</p><p>Our fulfillment team has notified us that your package was returned due to an address error. The carrier wasn''t able to complete delivery.</p><p>The address used during checkout was:<br>{{shipping_address_full}}</p><p>To get your order to you, please reply with your corrected shipping address. We''ll reship your order at no additional cost and provide you with new tracking information.</p><p>Thank you for your patience!</p><p>Best regards,<br>{{merchant_name}} with {{merchant_store_name}}</p>',
'Hey {{customer_first_name}},

Our fulfillment team has notified us that your package was returned due to an address error. The carrier wasn''t able to complete delivery.

The address used during checkout was:
{{shipping_address_full}}

To get your order to you, please reply with your corrected shipping address. We''ll reship your order at no additional cost and provide you with new tracking information.

Thank you for your patience!

Best regards,
{{merchant_name}} with {{merchant_store_name}}',
ARRAY['Returned to Sender', 'Invalid Address', 'Delivery Exception'],
ARRAY['returned'],
34),

('No Such Number Exception', 'delivery_exception', 'Address number doesn''t exist in postal system',
'Delivery Issue - Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>The carrier has notified us that delivery failed due to: "No Such Number"</p><p>Your tracking number: {{tracking_number}}<br>Address on file: {{shipping_address_full}}</p><p>This usually means the street number doesn''t exist in the postal system. Please contact the carrier directly to resolve this, or reply with a corrected address and we''ll reship your order.</p><p>Carrier contact: {{carrier_phone_number}}</p><p>Let me know how you''d like to proceed!</p><p>Best regards,<br>{{merchant_name}} with {{merchant_store_name}}</p>',
'Hi {{customer_first_name}},

The carrier has notified us that delivery failed due to: "No Such Number"

Your tracking number: {{tracking_number}}
Address on file: {{shipping_address_full}}

This usually means the street number doesn''t exist in the postal system. Please contact the carrier directly to resolve this, or reply with a corrected address and we''ll reship your order.

Carrier contact: {{carrier_phone_number}}

Let me know how you''d like to proceed!

Best regards,
{{merchant_name}} with {{merchant_store_name}}',
ARRAY['Invalid Address', 'Delivery Exception'],
ARRAY['returned', 'shipped'],
35),

('No Access Exception', 'delivery_exception', 'Carrier couldn''t access delivery location',
'Delivery Access Issue - Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>The carrier notified us that delivery failed due to: "No Access to Delivery Location"</p><p>Your tracking: {{tracking_number}}<br>Address: {{shipping_address_full}}</p><p>Please contact the carrier directly to arrange delivery, or if there''s a better address, let us know and we can reship.</p><p>Carrier contact: {{carrier_phone_number}}</p><p>We''re here to help get this resolved!</p><p>Best regards,<br>{{merchant_name}} with {{merchant_store_name}}</p>',
'Hi {{customer_first_name}},

The carrier notified us that delivery failed due to: "No Access to Delivery Location"

Your tracking: {{tracking_number}}
Address: {{shipping_address_full}}

Please contact the carrier directly to arrange delivery, or if there''s a better address, let us know and we can reship.

Carrier contact: {{carrier_phone_number}}

We''re here to help get this resolved!

Best regards,
{{merchant_name}} with {{merchant_store_name}}',
ARRAY['Delivery Exception'],
ARRAY['shipped'],
36),

('Carrier Payment Hold', 'delivery_exception', 'Carrier charging customer for unpaid balance',
'About the Carrier Charge',
'<p>Hi {{customer_first_name}},</p><p>After investigating, I believe I understand what''s happening with your package.</p><p>It appears you have an unpaid balance with the shipping carrier from a previous delivery. They''ve placed a collection notice on your current package to collect that outstanding balance.</p><p><strong>Important:</strong> This charge is from the carrier, not from us or our company.</p><p>Looking at your tracking history, your package arrived at the local facility and was processed normally. The carrier then placed a "final notice" hold on it due to the unpaid balance from your previous package.</p><p>We have no affiliation with the carrier and no access to customer account information. For resolution, please contact them directly:</p><p>Carrier: {{carrier_name}}<br>Contact: {{carrier_phone_number}}</p><p>We''re unable to intervene in carrier billing matters, but please let us know if there''s anything else we can help with.</p><p>Best regards,<br>{{merchant_name}} with {{merchant_store_name}}</p>',
'Hi {{customer_first_name}},

After investigating, I believe I understand what''s happening with your package.

It appears you have an unpaid balance with the shipping carrier from a previous delivery. They''ve placed a collection notice on your current package to collect that outstanding balance.

Important: This charge is from the carrier, not from us or our company.

Looking at your tracking history, your package arrived at the local facility and was processed normally. The carrier then placed a "final notice" hold on it due to the unpaid balance from your previous package.

We have no affiliation with the carrier and no access to customer account information. For resolution, please contact them directly:

Carrier: {{carrier_name}}
Contact: {{carrier_phone_number}}

We''re unable to intervene in carrier billing matters, but please let us know if there''s anything else we can help with.

Best regards,
{{merchant_name}} with {{merchant_store_name}}',
ARRAY['Delivery Exception'],
ARRAY['shipped'],
37);

-- =====================================================
-- ADDRESS ISSUES
-- =====================================================
INSERT INTO email_templates (name, category, description, subject_line, body_html, body_plain, badges, order_status_hints, sort_order) VALUES
('Address Verification', 'address_issue', 'Confirm corrected address before fulfillment',
'Please Confirm Your Shipping Address',
'<p>Hello {{customer_first_name}},</p><p>Thank you for your recent order #{{order_number}}!</p><p>Before we ship, we noticed a potential issue with your shipping address. We want to make sure your order gets to you without any problems.</p><p>Address you entered:<br>{{shipping_address_full}}</p><p>Suggested corrected address:<br>[CORRECTED ADDRESS TO BE INSERTED]</p><p>We''ve updated your order to use the corrected address above.</p><p>Please reply to confirm:<br>1. The corrected address is accurate<br>2. Your order items are correct</p><p>We''ll wait for your confirmation before shipping to ensure everything is perfect!</p><p>Best regards,<br>{{merchant_name}} with {{merchant_store_name}}</p>',
'Hello {{customer_first_name}},

Thank you for your recent order #{{order_number}}!

Before we ship, we noticed a potential issue with your shipping address. We want to make sure your order gets to you without any problems.

Address you entered:
{{shipping_address_full}}

Suggested corrected address:
[CORRECTED ADDRESS TO BE INSERTED]

We''ve updated your order to use the corrected address above.

Please reply to confirm:
1. The corrected address is accurate
2. Your order items are correct

We''ll wait for your confirmation before shipping to ensure everything is perfect!

Best regards,
{{merchant_name}} with {{merchant_store_name}}',
ARRAY['Not Shipped', 'Address Issue', 'Need Confirm'],
ARRAY['pending', 'not_shipped'],
40),

('Edit Address: Not Shipped', 'address_issue', 'Update address before shipment',
'Address Updated',
'<p>Hi {{customer_first_name}},</p><p>Thank you for contacting us! I''ve updated your shipping address and you should be all set now. You will receive a confirmation email when your package ships. Let me know if there''s anything else I can help with!</p>',
'Hi {{customer_first_name}},

Thank you for contacting us! I''ve updated your shipping address and you should be all set now. You will receive a confirmation email when your package ships. Let me know if there''s anything else I can help with!',
ARRAY['Not Shipped', 'Address Issue'],
ARRAY['pending', 'not_shipped'],
41),

('Edit Address: Already Shipped', 'address_issue', 'Instructions for address changes after shipping',
'About Changing Your Address',
'<p>Hi {{customer_first_name}}, you need to wait until you receive your "out for delivery" email from us. That email will provide you with a "last-mile" tracking number that will work with your local courier.</p><p><<<INTERNAL NOTE>>><br>USA : USPS<br>AU: Australian Post<br>Canada: Canada Post</p><p>Once you receive our email with this tracking code you need to call USPS/AU Post/CA Post as they will be able to intercept the routing for you.</p><p>We cannot do it for you as they will only speak with the receiver of the package for any adjustments.</p><p>We''ll be here to assist you should you need any further help</p>',
'Hi {{customer_first_name}}, you need to wait until you receive your "out for delivery" email from us. That email will provide you with a "last-mile" tracking number that will work with your local courier.

<<<INTERNAL NOTE>>>
USA : USPS
AU: Australian Post
Canada: Canada Post

Once you receive our email with this tracking code you need to call USPS/AU Post/CA Post as they will be able to intercept the routing for you.

We cannot do it for you as they will only speak with the receiver of the package for any adjustments.

We''ll be here to assist you should you need any further help',
ARRAY['Shipped', 'Address Issue'],
ARRAY['shipped', 'in_transit'],
42);

-- =====================================================
-- CANCELLATIONS
-- =====================================================
INSERT INTO email_templates (name, category, description, subject_line, body_html, body_plain, badges, order_status_hints, sort_order) VALUES
('Order Cancellation: Not Shipped', 'cancel', 'Cancel and refund order before shipping',
'Order Cancelled',
'<p>Hello {{customer_first_name}},</p><p>I''ve canceled your last order, and issued a refund.</p>',
'Hello {{customer_first_name}},

I''ve canceled your last order, and issued a refund.',
ARRAY['Not Shipped', 'Full Refund'],
ARRAY['pending', 'not_shipped'],
50),

('Order Cancellation: Already Shipped', 'cancel', 'Handle cancel request for shipped orders',
'About Your Cancellation Request',
'<p>Hi {{customer_first_name}},</p><p>Thank you for reaching out to us.</p><p>Unfortunately, it looks like your order has already processed or shipped from our warehouse. Therefore, I am unable to make any changes to it at this time. You can simply refuse the package upon delivery, and once your online tracking information updates confirming that your set is being returned back to us, please let me know right away and I''ll be happy to get an updated order sent out to you.</p><p>Please let me know if you have any questions in the meantime, {{customer_first_name}}</p>',
'Hi {{customer_first_name}},

Thank you for reaching out to us.

Unfortunately, it looks like your order has already processed or shipped from our warehouse. Therefore, I am unable to make any changes to it at this time. You can simply refuse the package upon delivery, and once your online tracking information updates confirming that your set is being returned back to us, please let me know right away and I''ll be happy to get an updated order sent out to you.

Please let me know if you have any questions in the meantime, {{customer_first_name}}',
ARRAY['Shipped'],
ARRAY['shipped', 'in_transit'],
51);

-- =====================================================
-- UPSELL MANAGEMENT
-- =====================================================
INSERT INTO email_templates (name, category, description, subject_line, body_html, body_plain, badges, order_status_hints, sort_order) VALUES
('Cancel Upsell: Not Shipped', 'upsell', 'Remove upsell before shipping',
'Upsell Item Removed',
'<p>Hi {{customer_first_name}}, thanks for reaching out.</p><p>We''ve taken a look at your order and see that a second item was added through a special offer during checkout. No worries at all, this happens occasionally and we''re happy to help.</p><p>We can absolutely remove the second purchase.</p><p>Your order has not shipped yet, so we''ve gone ahead and removed the second item and refunded you the difference. You''ll receive a confirmation email shortly.</p>',
'Hi {{customer_first_name}}, thanks for reaching out.

We''ve taken a look at your order and see that a second item was added through a special offer during checkout. No worries at all, this happens occasionally and we''re happy to help.

We can absolutely remove the second purchase.

Your order has not shipped yet, so we''ve gone ahead and removed the second item and refunded you the difference. You''ll receive a confirmation email shortly.',
ARRAY['Not Shipped', 'Took Upsell', 'Partial Refund'],
ARRAY['pending', 'not_shipped'],
60),

('Cancel Upsell: Fulfillment', 'upsell', 'Attempt to reverse upsell after fulfillment',
'About Your Upsell Item',
'<p>Hi {{customer_first_name}}, thanks for reaching out.</p><p>We''ve taken a look at your order and see that a second item was added through a special offer during checkout. No worries at all, this happens occasionally and we''re happy to help.</p><p>Your order has already shipped, but we can still help! It seems it hasn''t been passed off yet to the courier which means it might be reversible. Our team will get in contact with the logistics company to see if the package is reversible.</p><p>However if it is not reversible...once you receive it, we can guide you through our quick return process for a refund.</p>',
'Hi {{customer_first_name}}, thanks for reaching out.

We''ve taken a look at your order and see that a second item was added through a special offer during checkout. No worries at all, this happens occasionally and we''re happy to help.

Your order has already shipped, but we can still help! It seems it hasn''t been passed off yet to the courier which means it might be reversible. Our team will get in contact with the logistics company to see if the package is reversible.

However if it is not reversible...once you receive it, we can guide you through our quick return process for a refund.',
ARRAY['Shipped', 'Took Upsell'],
ARRAY['fulfillment', 'shipped'],
61),

('Cancel Upsell: Shipped', 'upsell', 'Return process for shipped upsell items',
'About Your Upsell Item',
'<p>Hi {{customer_first_name}}, thanks for reaching out.</p><p>We''ve taken a look at your order and see that a second item was added through a special offer during checkout. No worries at all, this happens occasionally and we''re happy to help.</p><p>We can absolutely remove the second purchase.</p><p>Your order has already shipped, but we can still help! Once you receive it, we can guide you through our quick return process for a refund.</p><p>Please reach out once you receive your package for next steps.</p>',
'Hi {{customer_first_name}}, thanks for reaching out.

We''ve taken a look at your order and see that a second item was added through a special offer during checkout. No worries at all, this happens occasionally and we''re happy to help.

We can absolutely remove the second purchase.

Your order has already shipped, but we can still help! Once you receive it, we can guide you through our quick return process for a refund.

Please reach out once you receive your package for next steps.',
ARRAY['Shipped', 'Took Upsell'],
ARRAY['shipped', 'in_transit'],
62),

('Accidental Upsell: Shipped', 'upsell', 'Handle accidental upsell acceptance after shipping',
'About Your Additional Item',
'<p>Hi {{customer_first_name}},</p><p>Thanks for reaching out. I can see a second item was added to your order through a post-purchase offer. I understand this may have been accidental - this happens occasionally.</p><p>Since your order has already shipped, here''s what we can do:</p><p>Once you receive your package, simply reach back out and we''ll process a no-cost return for the unwanted item. We''ll make this as easy as possible for you and cover any return fees.</p><p>I''ll make a note on your account so we can expedite this when you''re ready.</p><p>Best regards,<br>{{merchant_name}} with {{merchant_store_name}}</p>',
'Hi {{customer_first_name}},

Thanks for reaching out. I can see a second item was added to your order through a post-purchase offer. I understand this may have been accidental - this happens occasionally.

Since your order has already shipped, here''s what we can do:

Once you receive your package, simply reach back out and we''ll process a no-cost return for the unwanted item. We''ll make this as easy as possible for you and cover any return fees.

I''ll make a note on your account so we can expedite this when you''re ready.

Best regards,
{{merchant_name}} with {{merchant_store_name}}',
ARRAY['Shipped', 'Took Upsell'],
ARRAY['shipped', 'in_transit'],
63);

-- =====================================================
-- REFUNDS
-- =====================================================
INSERT INTO email_templates (name, category, description, subject_line, body_html, body_plain, badges, order_status_hints, sort_order) VALUES
('Full Refund: Not Shipped', 'refund', 'Issue full refund before shipping',
'Refund Processed',
'<p>Hello {{customer_first_name}},</p><p>I''ve refunded your last order {{order_number}}, please allow 3-5 business days for the refund to be processed. Reimbursement of funds will be allocated back to the original form of payment used for purchase. Thank you.</p>',
'Hello {{customer_first_name}},

I''ve refunded your last order {{order_number}}, please allow 3-5 business days for the refund to be processed. Reimbursement of funds will be allocated back to the original form of payment used for purchase. Thank you.',
ARRAY['Not Shipped', 'Full Refund'],
ARRAY['pending', 'not_shipped'],
70),

('Partial Refund: Not Shipped', 'refund', 'Issue partial refund before shipping',
'Partial Refund Processed',
'<p>Hello {{customer_first_name}},</p><p>I''ve issued you a partial refund for your last order {{order_number}}, please allow 3-5 business days for the refund to be processed. Reimbursement of funds will be allocated back to the original form of payment used for purchase. Thank you.</p>',
'Hello {{customer_first_name}},

I''ve issued you a partial refund for your last order {{order_number}}, please allow 3-5 business days for the refund to be processed. Reimbursement of funds will be allocated back to the original form of payment used for purchase. Thank you.',
ARRAY['Not Shipped', 'Partial Refund'],
ARRAY['pending', 'not_shipped'],
71),

('Expedited Processing Refund', 'refund', 'Refund expedited processing fee for delays',
'Apology and Refund',
'<p>Hello {{customer_first_name}}, I am terribly sorry about the delay in processing your order and getting it out for delivery.</p><p>We are working hard to keep up with the demand of these products and we were a few days behind on processing orders. In the past week we added two new production lines to our manufacturing facility and with this we will now be able to get back on track and stay ahead of the demand!</p><p>However since we were late to ship your order, I went ahead and refunded you for the $5 you paid for expedited processing. As a way of saying sorry to you.</p><p>Please also be on the lookout for further emails regarding your order delivery status from us. We thank you dearly for being a customer.</p>',
'Hello {{customer_first_name}}, I am terribly sorry about the delay in processing your order and getting it out for delivery.

We are working hard to keep up with the demand of these products and we were a few days behind on processing orders. In the past week we added two new production lines to our manufacturing facility and with this we will now be able to get back on track and stay ahead of the demand!

However since we were late to ship your order, I went ahead and refunded you for the $5 you paid for expedited processing. As a way of saying sorry to you.

Please also be on the lookout for further emails regarding your order delivery status from us. We thank you dearly for being a customer.',
ARRAY['Not Shipped', 'Expedited', 'Partial Refund'],
ARRAY['pending', 'not_shipped'],
72),

('Shipping Complaint', 'shipping', 'Address refund requests due to tariff delays',
'About Your Delivery Delay',
'<p>Hello {{customer_first_name}},</p><p>Thank you for reaching out. You''re right. Your package has oddly taken a long time to get to you.</p><p>I''ve noticed in this month many packages have been delayed up to twice the expected delivery time. Mainly due to U.S. customs, sorting centers and delivery facilities taking longer than expected to process and move packages along. I''ve spoke to our logistical partners and what they returned to me is that they are dealing with a backlog of millions of packages due to new adjustments caused by the new tariffs.</p><p>It has been a hard month for many online vendors and logistical companies and I am very sorry that this has caused your package to be delayed. However I believe your package is now at the delivery facility and USPS should have it out for delivery in no time.</p><p>You can track your order here:<br>{{tracking_url}}</p><p>P.s. if you''d like a refund we will have to start a return process which entails starting a return. Once you receive your order if you do wish to start a return just reach out and we''ll be here to help. Thanks</p>',
'Hello {{customer_first_name}},

Thank you for reaching out. You''re right. Your package has oddly taken a long time to get to you.

I''ve noticed in this month many packages have been delayed up to twice the expected delivery time. Mainly due to U.S. customs, sorting centers and delivery facilities taking longer than expected to process and move packages along. I''ve spoke to our logistical partners and what they returned to me is that they are dealing with a backlog of millions of packages due to new adjustments caused by the new tariffs.

It has been a hard month for many online vendors and logistical companies and I am very sorry that this has caused your package to be delayed. However I believe your package is now at the delivery facility and USPS should have it out for delivery in no time.

You can track your order here:
{{tracking_url}}

P.s. if you''d like a refund we will have to start a return process which entails starting a return. Once you receive your order if you do wish to start a return just reach out and we''ll be here to help. Thanks',
ARRAY['Shipped'],
ARRAY['shipped', 'in_transit'],
73);

-- =====================================================
-- CHARGEBACKS
-- =====================================================
INSERT INTO email_templates (name, category, description, subject_line, body_html, body_plain, badges, order_status_hints, sort_order) VALUES
('Chargeback Response: Shipped', 'chargeback', 'Respond to chargeback for shipped orders',
'Regarding Your Chargeback - Order {{order_number}}',
'<p>Hello {{customer_first_name}},</p><p>We''ve been notified of a chargeback filed for order #{{order_number}}.</p><p>We''ve sent shipping confirmations to your email ({{customer_email}}) - please check your spam folder if you didn''t receive them.</p><p><strong>Order status:</strong><br>- Shipped: {{shipped_date}}<br>- Ship to: {{shipping_address_full}}<br>- Tracking: {{tracking_url}}<br>- Order status: {{order_status_url}}</p><p>Our records show you haven''t contacted us about any issues with this order. We''re confident this may be a misunderstanding.</p><p>We strongly encourage you to contact your card issuer to reverse the chargeback. We''ll be submitting evidence that this was a legitimate purchase.</p><p><strong>Important information about chargebacks:</strong><br>Chargebacks negatively impact both merchants and consumers. They affect your consumer score on the global payment network, which merchants and payment processors can see. This may result in difficulty making future online purchases as retailers may view you as high-risk. Many major platforms (including Shopify) assign fraud risk ratings based on chargeback history.</p><p>We''re here to resolve any concerns. Please reach out if there''s an issue we can help with.</p><p>Awaiting your response,<br>{{merchant_name}} with {{merchant_store_name}}</p>',
'Hello {{customer_first_name}},

We''ve been notified of a chargeback filed for order #{{order_number}}.

We''ve sent shipping confirmations to your email ({{customer_email}}) - please check your spam folder if you didn''t receive them.

Order status:
- Shipped: {{shipped_date}}
- Ship to: {{shipping_address_full}}
- Tracking: {{tracking_url}}
- Order status: {{order_status_url}}

Our records show you haven''t contacted us about any issues with this order. We''re confident this may be a misunderstanding.

We strongly encourage you to contact your card issuer to reverse the chargeback. We''ll be submitting evidence that this was a legitimate purchase.

Important information about chargebacks:
Chargebacks negatively impact both merchants and consumers. They affect your consumer score on the global payment network, which merchants and payment processors can see. This may result in difficulty making future online purchases as retailers may view you as high-risk. Many major platforms (including Shopify) assign fraud risk ratings based on chargeback history.

We''re here to resolve any concerns. Please reach out if there''s an issue we can help with.

Awaiting your response,
{{merchant_name}} with {{merchant_store_name}}',
ARRAY['Shipped', 'Chargeback'],
ARRAY['shipped'],
80),

('Chargeback Response: Delivered', 'chargeback', 'Respond to chargeback for delivered orders',
'Regarding Your Chargeback - Order {{order_number}}',
'<p>Hello {{customer_first_name}},</p><p>We''ve been notified of a chargeback filed for order #{{order_number}}.</p><p>We''ve sent both shipping and delivery confirmations to your email ({{customer_email}}) - please check your spam folder if you didn''t receive them.</p><p><strong>Order status:</strong><br>- Status: DELIVERED<br>- Delivered to: {{shipping_address_full}}<br>- Tracking: {{tracking_url}}<br>- Order details: {{order_status_url}}</p><p>Our records show you haven''t contacted us about any issues with this order. This appears to be a misunderstanding.</p><p>We strongly urge you to contact your card issuer to reverse the chargeback. We''ll be submitting comprehensive evidence that this was a legitimate, completed transaction.</p><p><strong>Critical information about chargebacks:</strong><br>Chargebacks severely impact both merchants and consumers. Each chargeback negatively affects your consumer score on global payment networks. This score is visible to all merchants and payment processors, who use it to assess risk. Multiple chargebacks can result in:<br>- Inability to checkout on major e-commerce platforms<br>- Automatic order cancellations<br>- Payment method declines<br>- Being flagged as high-risk across the retail network</p><p>Major platforms like Shopify assign permanent fraud risk ratings based on chargeback history, which follows your payment information across all participating merchants.</p><p>We recommend reversing this chargeback immediately to protect your purchasing ability. If there''s an actual issue with your order, please contact us and we''ll resolve it properly.</p><p>Awaiting your response,<br>{{merchant_name}} with {{merchant_store_name}}</p>',
'Hello {{customer_first_name}},

We''ve been notified of a chargeback filed for order #{{order_number}}.

We''ve sent both shipping and delivery confirmations to your email ({{customer_email}}) - please check your spam folder if you didn''t receive them.

Order status:
- Status: DELIVERED
- Delivered to: {{shipping_address_full}}
- Tracking: {{tracking_url}}
- Order details: {{order_status_url}}

Our records show you haven''t contacted us about any issues with this order. This appears to be a misunderstanding.

We strongly urge you to contact your card issuer to reverse the chargeback. We''ll be submitting comprehensive evidence that this was a legitimate, completed transaction.

Critical information about chargebacks:
Chargebacks severely impact both merchants and consumers. Each chargeback negatively affects your consumer score on global payment networks. This score is visible to all merchants and payment processors, who use it to assess risk. Multiple chargebacks can result in:
- Inability to checkout on major e-commerce platforms
- Automatic order cancellations
- Payment method declines
- Being flagged as high-risk across the retail network

Major platforms like Shopify assign permanent fraud risk ratings based on chargeback history, which follows your payment information across all participating merchants.

We recommend reversing this chargeback immediately to protect your purchasing ability. If there''s an actual issue with your order, please contact us and we''ll resolve it properly.

Awaiting your response,
{{merchant_name}} with {{merchant_store_name}}',
ARRAY['Delivered', 'Chargeback'],
ARRAY['delivered'],
81),

('Chargeback Follow-Up: Upsell', 'chargeback', 'Resolve chargeback involving accidental upsell',
'Resolving Your Chargeback - Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>Thank you for getting back to me. I understand your concern and want to help resolve this.</p><p>You can track your order here: {{tracking_url}}</p><p>I''ve reviewed your order and noticed a second item was added through a post-purchase offer. I understand this may have been accidental - this happens occasionally and we''re happy to help.</p><p>Normally, once you receive the item, we''d process a quick return and refund for the unwanted item.</p><p>However, with the chargeback filed, we can''t process a refund (the funds have already been taken by your bank). To resolve this properly:</p><ol><li>Contact your bank/card issuer to reverse the chargeback</li><li>Once reversed, we''ll immediately process the return and refund for the unwanted item</li></ol><p>The current situation has both the payment reversed AND the items shipping to you. By reversing the chargeback, we can properly return the unwanted item and issue the appropriate refund.</p><p>Let me know once you''ve contacted your bank and we''ll get this resolved right away!</p><p>Best regards,<br>{{merchant_name}} with {{merchant_store_name}}</p>',
'Hi {{customer_first_name}},

Thank you for getting back to me. I understand your concern and want to help resolve this.

You can track your order here: {{tracking_url}}

I''ve reviewed your order and noticed a second item was added through a post-purchase offer. I understand this may have been accidental - this happens occasionally and we''re happy to help.

Normally, once you receive the item, we''d process a quick return and refund for the unwanted item.

However, with the chargeback filed, we can''t process a refund (the funds have already been taken by your bank). To resolve this properly:

1. Contact your bank/card issuer to reverse the chargeback
2. Once reversed, we''ll immediately process the return and refund for the unwanted item

The current situation has both the payment reversed AND the items shipping to you. By reversing the chargeback, we can properly return the unwanted item and issue the appropriate refund.

Let me know once you''ve contacted your bank and we''ll get this resolved right away!

Best regards,
{{merchant_name}} with {{merchant_store_name}}',
ARRAY['Shipped', 'Chargeback', 'Took Upsell'],
ARRAY['shipped'],
82),

('Chargeback Follow-Up: General', 'chargeback', 'Follow up on chargeback to resolve issue',
'Resolving Your Chargeback - Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>Thank you for responding. I want to help resolve this situation.</p><p>Track your order: {{tracking_url}}</p><p>I understand you may have concerns, but a chargeback wasn''t necessary - we''re always here to help resolve issues.</p><p>Your order has shipped. Normally, if you''re unsatisfied once you receive it, we''d guide you through our return process for a proper refund.</p><p>However, with the chargeback filed, we cannot process returns or refunds (your bank has already taken the funds). To resolve this properly:</p><ol><li>Contact your bank/card issuer to reverse the chargeback</li><li>Once reversed, we can process your return/refund through proper channels</li></ol><p>The current situation has both the payment reversed AND items shipping to you. By reversing the chargeback, we can properly handle your return and issue an appropriate refund if needed.</p><p>We''re here to help make this right. Please contact your bank and let me know once it''s reversed.</p><p>Best regards,<br>{{merchant_name}} with {{merchant_store_name}}</p>',
'Hi {{customer_first_name}},

Thank you for responding. I want to help resolve this situation.

Track your order: {{tracking_url}}

I understand you may have concerns, but a chargeback wasn''t necessary - we''re always here to help resolve issues.

Your order has shipped. Normally, if you''re unsatisfied once you receive it, we''d guide you through our return process for a proper refund.

However, with the chargeback filed, we cannot process returns or refunds (your bank has already taken the funds). To resolve this properly:

1. Contact your bank/card issuer to reverse the chargeback
2. Once reversed, we can process your return/refund through proper channels

The current situation has both the payment reversed AND items shipping to you. By reversing the chargeback, we can properly handle your return and issue an appropriate refund if needed.

We''re here to help make this right. Please contact your bank and let me know once it''s reversed.

Best regards,
{{merchant_name}} with {{merchant_store_name}}',
ARRAY['Shipped', 'Chargeback'],
ARRAY['shipped'],
83);
