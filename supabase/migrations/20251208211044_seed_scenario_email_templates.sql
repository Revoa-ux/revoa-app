/*
  # Seed Scenario-Based Email Templates

  1. Purpose
    - Insert pre-built email templates for common customer service scenarios
    - Templates include dynamic variables for personalization
    - Covers: replacement, damaged, return, defective, shipping, confirmation, quote_followup, inquiry, thankyou
  
  2. Template Variables Supported
    - Customer: {{customer_first_name}}, {{customer_last_name}}, {{customer_email}}
    - Order: {{order_number}}, {{order_date}}, {{order_items}}, {{order_total}}
    - Quote: {{product_name}}, {{warranty_days}}, {{covers_damaged}}, {{covers_lost}}
    - Shipping: {{shipping_address_full}}, {{tracking_number}}
    - System: {{merchant_name}}, {{current_date}}
*/

-- Replacement Request Templates
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, sort_order) VALUES
('Standard Replacement Request', 'replacement', 'Replacement Request for Order {{order_number}}', 
'<p>Hi {{customer_first_name}},</p><p>Thank you for reaching out about your order {{order_number}}. We''re sorry to hear there''s an issue with your item.</p><p><strong>Order Details:</strong><br>{{order_items}}</p><p>Your product includes a {{warranty_days}}-day warranty that covers damaged items: {{covers_damaged}}.</p><p>To process your replacement, please reply to this email with:</p><ul><li>Photos of the damaged/defective item</li><li>A brief description of the issue</li></ul><p>Once we receive this information, we''ll process your replacement right away.</p><p>Thank you for your patience!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

Thank you for reaching out about your order {{order_number}}. We''re sorry to hear there''s an issue with your item.

Order Details:
{{order_items}}

Your product includes a {{warranty_days}}-day warranty that covers damaged items: {{covers_damaged}}.

To process your replacement, please reply to this email with:
- Photos of the damaged/defective item
- A brief description of the issue

Once we receive this information, we''ll process your replacement right away.

Thank you for your patience!

Best regards,
{{merchant_name}}', 0),

('Replacement Approved', 'replacement', 'Your Replacement Has Been Approved - Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>Great news! Your replacement request for order {{order_number}} has been approved.</p><p><strong>What happens next:</strong></p><ul><li>We''ll ship your replacement within the next 2-3 business days</li><li>You''ll receive a tracking number once it ships</li><li>The replacement will be sent to: {{shipping_address_full}}</li></ul><p>If you have any questions, feel free to reply to this email.</p><p>Thanks for your patience!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

Great news! Your replacement request for order {{order_number}} has been approved.

What happens next:
- We''ll ship your replacement within the next 2-3 business days
- You''ll receive a tracking number once it ships
- The replacement will be sent to: {{shipping_address_full}}

If you have any questions, feel free to reply to this email.

Thanks for your patience!

Best regards,
{{merchant_name}}', 1);

-- Damaged Items Templates
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, sort_order) VALUES
('Damaged Item Report', 'damaged', 'Report: Damaged Item in Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>We''re sorry to hear that your order {{order_number}} arrived damaged.</p><p><strong>Product Warranty Coverage:</strong><br>• Warranty Period: {{warranty_days}} days<br>• Covers Damaged Items: {{covers_damaged}}<br>• Covers Lost Items: {{covers_lost}}</p><p>To help us process this quickly, please provide:</p><ol><li>Clear photos of the damaged item(s)</li><li>Photos of the packaging (if still available)</li><li>A description of the damage</li></ol><p>Once we receive these details, we''ll immediately work on a resolution for you.</p><p>We apologize for the inconvenience!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

We''re sorry to hear that your order {{order_number}} arrived damaged.

Product Warranty Coverage:
• Warranty Period: {{warranty_days}} days
• Covers Damaged Items: {{covers_damaged}}
• Covers Lost Items: {{covers_lost}}

To help us process this quickly, please provide:
1. Clear photos of the damaged item(s)
2. Photos of the packaging (if still available)
3. A description of the damage

Once we receive these details, we''ll immediately work on a resolution for you.

We apologize for the inconvenience!

Best regards,
{{merchant_name}}', 0);

-- Return & Refund Templates
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, sort_order) VALUES
('Return Instructions', 'return', 'Return Instructions for Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>We''ve received your return request for order {{order_number}}.</p><p><strong>Return Details:</strong><br>Order Date: {{order_date}}<br>Items: {{order_items}}</p><p><strong>Return Instructions:</strong></p><ol><li>Please ship the item(s) back to the address we''ll provide in a separate email</li><li>Include your order number inside the package</li><li>We recommend using a trackable shipping method</li></ol><p>Once we receive and inspect the returned item(s), we''ll process your refund within 3-5 business days.</p><p>If you have any questions, please don''t hesitate to ask!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

We''ve received your return request for order {{order_number}}.

Return Details:
Order Date: {{order_date}}
Items: {{order_items}}

Return Instructions:
1. Please ship the item(s) back to the address we''ll provide in a separate email
2. Include your order number inside the package
3. We recommend using a trackable shipping method

Once we receive and inspect the returned item(s), we''ll process your refund within 3-5 business days.

If you have any questions, please don''t hesitate to ask!

Best regards,
{{merchant_name}}', 0);

-- Defective Product Templates
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, sort_order) VALUES
('Defective Product Report', 'defective', 'Defective Product Report - Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>Thank you for reporting the issue with your {{product_name}} from order {{order_number}}.</p><p><strong>Warranty Information:</strong><br>Your product is covered by a {{warranty_days}}-day warranty from the date of purchase ({{order_date}}).</p><p>To help us resolve this quickly, please provide:</p><ul><li>A detailed description of the defect</li><li>Photos or videos showing the issue</li><li>When you first noticed the problem</li></ul><p>Based on your report, we''ll either send you a replacement or process a refund.</p><p>We stand behind our products and will make this right!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

Thank you for reporting the issue with your {{product_name}} from order {{order_number}}.

Warranty Information:
Your product is covered by a {{warranty_days}}-day warranty from the date of purchase ({{order_date}}).

To help us resolve this quickly, please provide:
- A detailed description of the defect
- Photos or videos showing the issue
- When you first noticed the problem

Based on your report, we''ll either send you a replacement or process a refund.

We stand behind our products and will make this right!

Best regards,
{{merchant_name}}', 0);

-- Shipping Update Templates
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, sort_order) VALUES
('Shipment Confirmation', 'shipping', 'Your Order {{order_number}} Has Shipped!',
'<p>Hi {{customer_first_name}},</p><p>Great news! Your order {{order_number}} has been shipped and is on its way to you.</p><p><strong>Tracking Information:</strong><br>Tracking Number: {{tracking_number}}</p><p><strong>Shipping Address:</strong><br>{{shipping_address_full}}</p><p><strong>What''s Inside:</strong><br>{{order_items}}</p><p>You can expect delivery within 7-10 business days. We''ll send you another email when your package is out for delivery.</p><p>If you have any questions, feel free to reach out!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

Great news! Your order {{order_number}} has been shipped and is on its way to you.

Tracking Information:
Tracking Number: {{tracking_number}}

Shipping Address:
{{shipping_address_full}}

What''s Inside:
{{order_items}}

You can expect delivery within 7-10 business days. We''ll send you another email when your package is out for delivery.

If you have any questions, feel free to reach out!

Best regards,
{{merchant_name}}', 0),

('Delayed Shipment Notification', 'shipping', 'Update on Your Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>We wanted to give you an update on your order {{order_number}}.</p><p>Unfortunately, there''s been a slight delay with your shipment. We''re working to get it out to you as quickly as possible and expect to ship it within the next 3-5 business days.</p><p>We sincerely apologize for any inconvenience this may cause. We''ll send you a tracking number as soon as your order ships.</p><p>Thank you for your patience and understanding!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

We wanted to give you an update on your order {{order_number}}.

Unfortunately, there''s been a slight delay with your shipment. We''re working to get it out to you as quickly as possible and expect to ship it within the next 3-5 business days.

We sincerely apologize for any inconvenience this may cause. We''ll send you a tracking number as soon as your order ships.

Thank you for your patience and understanding!

Best regards,
{{merchant_name}}', 1);

-- Order Confirmation Templates
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, sort_order) VALUES
('Order Received Confirmation', 'confirmation', 'Order Confirmation - {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>Thank you for your order! We''ve received it and are getting it ready for shipment.</p><p><strong>Order Details:</strong><br>Order Number: {{order_number}}<br>Order Date: {{order_date}}<br>Total: {{order_total}}</p><p><strong>Items Ordered:</strong><br>{{order_items}}</p><p><strong>Shipping To:</strong><br>{{shipping_address_full}}</p><p>We''ll send you another email with tracking information once your order ships.</p><p>If you have any questions, please don''t hesitate to reach out!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

Thank you for your order! We''ve received it and are getting it ready for shipment.

Order Details:
Order Number: {{order_number}}
Order Date: {{order_date}}
Total: {{order_total}}

Items Ordered:
{{order_items}}

Shipping To:
{{shipping_address_full}}

We''ll send you another email with tracking information once your order ships.

If you have any questions, please don''t hesitate to reach out!

Best regards,
{{merchant_name}}', 0);

-- Quote Follow-up Templates
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, sort_order) VALUES
('Quote Follow-up', 'quote_followup', 'Following Up on Your Quote',
'<p>Hi {{customer_first_name}},</p><p>I wanted to follow up on the quote we provided for {{product_name}}.</p><p>Do you have any questions about the pricing, specifications, or delivery timeline? I''m here to help!</p><p>Just reply to this email and I''ll be happy to provide more information or adjust the quote based on your needs.</p><p>Looking forward to hearing from you!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

I wanted to follow up on the quote we provided for {{product_name}}.

Do you have any questions about the pricing, specifications, or delivery timeline? I''m here to help!

Just reply to this email and I''ll be happy to provide more information or adjust the quote based on your needs.

Looking forward to hearing from you!

Best regards,
{{merchant_name}}', 0);

-- General Inquiry Templates
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, sort_order) VALUES
('General Response', 'inquiry', 'Re: Your Inquiry',
'<p>Hi {{customer_first_name}},</p><p>Thank you for reaching out! I''ve received your message and wanted to let you know I''m looking into this for you.</p><p>I''ll get back to you with a detailed response within 24 hours.</p><p>If you have any additional information that might help, feel free to reply to this email.</p><p>Thanks for your patience!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

Thank you for reaching out! I''ve received your message and wanted to let you know I''m looking into this for you.

I''ll get back to you with a detailed response within 24 hours.

If you have any additional information that might help, feel free to reply to this email.

Thanks for your patience!

Best regards,
{{merchant_name}}', 0);

-- Thank You Templates
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, sort_order) VALUES
('Thank You for Your Order', 'thankyou', 'Thank You for Your Purchase!',
'<p>Hi {{customer_first_name}},</p><p>I just wanted to send a quick note to say thank you for your order {{order_number}}!</p><p>We truly appreciate your business and hope you love your {{product_name}}.</p><p>If you have any questions or concerns, please don''t hesitate to reach out. We''re always here to help!</p><p>Thanks again for choosing us!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

I just wanted to send a quick note to say thank you for your order {{order_number}}!

We truly appreciate your business and hope you love your {{product_name}}.

If you have any questions or concerns, please don''t hesitate to reach out. We''re always here to help!

Thanks again for choosing us!

Best regards,
{{merchant_name}}', 0);
