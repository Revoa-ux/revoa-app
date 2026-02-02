/*
  # Add Comprehensive Scenario Templates with Multi-Badge System

  1. Purpose
    - Add detailed templates covering all customer service scenarios
    - Each template has multiple badges for intelligent filtering
    - Templates match order statuses and required actions

  2. Template Categories Added
    - Order Status Updates (various states)
    - Returns & Cancellations (different fulfillment stages)
    - Address Issues (before/after shipping)
    - Refunds (partial/full, various states)
    - Delivery Issues (failed, exception, not received)
    - Upsell Management (different order states)
    - Chargeback Handling
    - Expedited Processing
*/

-- Order Status Updates
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, badges, order_status_hints, sort_order) VALUES
('Order Status: Out for Delivery', 'shipping', 'Your Order {{order_number}} is Out for Delivery!',
'<p>Hi {{customer_first_name}},</p><p>Great news! Your order {{order_number}} is out for delivery and should arrive today.</p><p><strong>Tracking Number:</strong> {{tracking_number}}</p><p>Please make sure someone is available to receive the package. If you''re not home, the carrier may leave it at your door or with a neighbor.</p><p>Questions? Reply to this email!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

Great news! Your order {{order_number}} is out for delivery and should arrive today.

Tracking Number: {{tracking_number}}

Please make sure someone is available to receive the package. If you''re not home, the carrier may leave it at your door or with a neighbor.

Questions? Reply to this email!

Best regards,
{{merchant_name}}',
ARRAY['Out for Delivery'],
ARRAY['out_for_delivery'],
10),

('Order Status: Delivered, Not Received', 'shipping', 'Re: Order {{order_number}} - Delivery Confirmation',
'<p>Hi {{customer_first_name}},</p><p>I see that tracking shows your order {{order_number}} was delivered on {{order_date}}, but you mentioned you haven''t received it.</p><p><strong>Let''s figure this out:</strong></p><ul><li>Was the package left at your door, mailbox, or with a neighbor?</li><li>Did anyone else at your address receive it?</li><li>Can you check with your building manager or front desk?</li></ul><p>If you still can''t locate it after checking these places, please let me know and we''ll file a claim with the carrier.</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

I see that tracking shows your order {{order_number}} was delivered on {{order_date}}, but you mentioned you haven''t received it.

Let''s figure this out:
- Was the package left at your door, mailbox, or with a neighbor?
- Did anyone else at your address receive it?
- Can you check with your building manager or front desk?

If you still can''t locate it after checking these places, please let me know and we''ll file a claim with the carrier.

Best regards,
{{merchant_name}}',
ARRAY['Delivered', 'Need Reason'],
ARRAY['delivered'],
11);

-- Returns at Different Stages
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, badges, order_status_hints, action_required, sort_order) VALUES
('Return Request: Need Confirm', 'return', 'Return Request for Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>Thank you for your return request for order {{order_number}}.</p><p><strong>Before we proceed, I need to confirm:</strong></p><ol><li>Is the item unused and in its original packaging?</li><li>Do you have all accessories and documentation that came with it?</li><li>What''s the reason for the return?</li></ol><p>Once you confirm these details, I''ll send you the return shipping label immediately.</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

Thank you for your return request for order {{order_number}}.

Before we proceed, I need to confirm:
1. Is the item unused and in its original packaging?
2. Do you have all accessories and documentation that came with it?
3. What''s the reason for the return?

Once you confirm these details, I''ll send you the return shipping label immediately.

Best regards,
{{merchant_name}}',
ARRAY['Need Confirm'],
ARRAY['shipped', 'delivered'],
'need_confirm',
20),

('Return Request: Need Reason', 'return', 'Return Details Needed - Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>I received your return request for order {{order_number}}.</p><p>To help me process this quickly, could you please let me know:</p><ul><li>What''s the reason for the return?</li><li>Is there anything defective or damaged?</li><li>Is there anything we could do to resolve this without a return?</li></ul><p>I want to make sure we get this right for you!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

I received your return request for order {{order_number}}.

To help me process this quickly, could you please let me know:
- What''s the reason for the return?
- Is there anything defective or damaged?
- Is there anything we could do to resolve this without a return?

I want to make sure we get this right for you!

Best regards,
{{merchant_name}}',
ARRAY['Need Reason'],
ARRAY['shipped', 'delivered'],
'need_reason',
21);

-- Cancellations
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, badges, order_status_hints, sort_order) VALUES
('Order Cancellation: Not Shipped', 'confirmation', 'Order {{order_number}} Cancelled & Refunded',
'<p>Hi {{customer_first_name}},</p><p>Your order {{order_number}} has been successfully cancelled.</p><p><strong>Refund Details:</strong><br>Amount: {{order_total}}<br>Refund Method: Original payment method<br>Processing Time: 3-5 business days</p><p>You should see the refund in your account within 3-5 business days.</p><p>If you change your mind, feel free to place a new order anytime!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

Your order {{order_number}} has been successfully cancelled.

Refund Details:
Amount: {{order_total}}
Refund Method: Original payment method
Processing Time: 3-5 business days

You should see the refund in your account within 3-5 business days.

If you change your mind, feel free to place a new order anytime!

Best regards,
{{merchant_name}}',
ARRAY['Not Shipped', 'Full Refund'],
ARRAY['pending', 'not_shipped'],
30),

('Order Cancellation: Already Shipped', 'shipping', 'Re: Order {{order_number}} Cancellation Request',
'<p>Hi {{customer_first_name}},</p><p>Thank you for reaching out about cancelling order {{order_number}}.</p><p>Unfortunately, your order has already been shipped (tracking: {{tracking_number}}) and cannot be cancelled at this point.</p><p><strong>Your options:</strong></p><ol><li><strong>Refuse delivery:</strong> Don''t accept the package when it arrives, and it will be returned to us. We''ll refund you once we receive it back.</li><li><strong>Return after delivery:</strong> Accept the package and initiate a return. We''ll email you a return label.</li></ol><p>Let me know which option works best for you!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

Thank you for reaching out about cancelling order {{order_number}}.

Unfortunately, your order has already been shipped (tracking: {{tracking_number}}) and cannot be cancelled at this point.

Your options:
1. Refuse delivery: Don''t accept the package when it arrives, and it will be returned to us. We''ll refund you once we receive it back.
2. Return after delivery: Accept the package and initiate a return. We''ll email you a return label.

Let me know which option works best for you!

Best regards,
{{merchant_name}}',
ARRAY['Shipped'],
ARRAY['shipped', 'in_transit'],
31);

-- Address Issues
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, badges, order_status_hints, sort_order) VALUES
('Edit Address: Not Shipped', 'shipping', 'Address Change Request - Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>Good news! I''ve updated the shipping address for order {{order_number}}.</p><p><strong>New Address:</strong><br>{{shipping_address_full}}</p><p>Your order will ship to this new address within 1-2 business days. You''ll receive a tracking number once it ships.</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

Good news! I''ve updated the shipping address for order {{order_number}}.

New Address:
{{shipping_address_full}}

Your order will ship to this new address within 1-2 business days. You''ll receive a tracking number once it ships.

Best regards,
{{merchant_name}}',
ARRAY['Not Shipped', 'Address Issue'],
ARRAY['pending', 'not_shipped'],
40),

('Edit Address: Already Shipped', 'shipping', 'Re: Address Change for Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>I received your request to change the shipping address for order {{order_number}}.</p><p>Unfortunately, your package has already shipped (tracking: {{tracking_number}}) and the address cannot be changed through us.</p><p><strong>Here''s what you can do:</strong></p><ol><li>Contact the carrier directly with your tracking number - they may be able to redirect the package</li><li>Contact the recipient at the original address and arrange for them to forward it</li><li>Wait for delivery, then refuse the package so it returns to us for a refund</li></ol><p>Let me know if you need any help!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

I received your request to change the shipping address for order {{order_number}}.

Unfortunately, your package has already shipped (tracking: {{tracking_number}}) and the address cannot be changed through us.

Here''s what you can do:
1. Contact the carrier directly with your tracking number - they may be able to redirect the package
2. Contact the recipient at the original address and arrange for them to forward it
3. Wait for delivery, then refuse the package so it returns to us for a refund

Let me know if you need any help!

Best regards,
{{merchant_name}}',
ARRAY['Shipped', 'Address Issue'],
ARRAY['shipped', 'in_transit'],
41),

('Delivery Exception: Invalid Address', 'shipping', 'Delivery Issue - Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>I wanted to let you know that the carrier encountered an issue delivering your order {{order_number}}.</p><p><strong>Issue:</strong> Invalid or incomplete address</p><p><strong>Current Status:</strong> Package is being returned to sender</p><p>To get your order to you, I need you to provide a valid, complete shipping address. Please include:</p><ul><li>Street address with apartment/unit number if applicable</li><li>City, State, ZIP code</li><li>Phone number</li></ul><p>Once I have the correct address, I''ll reship your order at no additional cost.</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

I wanted to let you know that the carrier encountered an issue delivering your order {{order_number}}.

Issue: Invalid or incomplete address

Current Status: Package is being returned to sender

To get your order to you, I need you to provide a valid, complete shipping address. Please include:
- Street address with apartment/unit number if applicable
- City, State, ZIP code
- Phone number

Once I have the correct address, I''ll reship your order at no additional cost.

Best regards,
{{merchant_name}}',
ARRAY['Returned to Sender', 'Invalid Address', 'Delivery Exception'],
ARRAY['returned'],
42);

-- Refund Scenarios
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, badges, order_status_hints, sort_order) VALUES
('Partial Refund: Not Shipped', 'confirmation', 'Partial Refund Processed - Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>I''ve processed a partial refund for order {{order_number}}.</p><p><strong>Refund Details:</strong><br>Refund Amount: [AMOUNT]<br>Original Total: {{order_total}}<br>Processing Time: 3-5 business days</p><p>The rest of your order will ship as planned. You''ll receive tracking information once it ships.</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

I''ve processed a partial refund for order {{order_number}}.

Refund Details:
Refund Amount: [AMOUNT]
Original Total: {{order_total}}
Processing Time: 3-5 business days

The rest of your order will ship as planned. You''ll receive tracking information once it ships.

Best regards,
{{merchant_name}}',
ARRAY['Not Shipped', 'Partial Refund'],
ARRAY['pending', 'not_shipped'],
50),

('Full Refund: Not Shipped', 'confirmation', 'Full Refund Processed - Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>Your refund for order {{order_number}} has been processed.</p><p><strong>Refund Details:</strong><br>Amount: {{order_total}}<br>Refund Method: Original payment method<br>Processing Time: 3-5 business days</p><p>You should see the funds back in your account within 3-5 business days.</p><p>If you have any other questions, I''m here to help!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

Your refund for order {{order_number}} has been processed.

Refund Details:
Amount: {{order_total}}
Refund Method: Original payment method
Processing Time: 3-5 business days

You should see the funds back in your account within 3-5 business days.

If you have any other questions, I''m here to help!

Best regards,
{{merchant_name}}',
ARRAY['Not Shipped', 'Full Refund'],
ARRAY['pending', 'not_shipped'],
51);

-- Upsell Management
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, badges, order_status_hints, sort_order) VALUES
('Cancel Upsell Item: Not Shipped', 'confirmation', 'Upsell Item Removed - Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>I''ve removed the upsell item from your order {{order_number}} and processed a partial refund.</p><p><strong>Refund Details:</strong><br>Refund Amount: [UPSELL_AMOUNT]<br>Processing Time: 3-5 business days</p><p>The rest of your order will ship as planned.</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

I''ve removed the upsell item from your order {{order_number}} and processed a partial refund.

Refund Details:
Refund Amount: [UPSELL_AMOUNT]
Processing Time: 3-5 business days

The rest of your order will ship as planned.

Best regards,
{{merchant_name}}',
ARRAY['Not Shipped', 'Took Upsell', 'Partial Refund'],
ARRAY['pending', 'not_shipped'],
60),

('Cancel Upsell Item: Shipped', 'shipping', 'Re: Upsell Item Removal - Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>I received your request to remove the upsell item from order {{order_number}}.</p><p>Unfortunately, your order has already shipped as a complete package (tracking: {{tracking_number}}).</p><p><strong>Your options:</strong></p><ol><li><strong>Keep everything:</strong> Receive the full order as shipped</li><li><strong>Return just the upsell:</strong> Accept delivery, then return only the upsell item (we''ll email a return label)</li><li><strong>Refuse entire delivery:</strong> Refuse the package for a full refund once it returns to us</li></ol><p>Let me know what works best for you!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

I received your request to remove the upsell item from order {{order_number}}.

Unfortunately, your order has already shipped as a complete package (tracking: {{tracking_number}}).

Your options:
1. Keep everything: Receive the full order as shipped
2. Return just the upsell: Accept delivery, then return only the upsell item (we''ll email a return label)
3. Refuse entire delivery: Refuse the package for a full refund once it returns to us

Let me know what works best for you!

Best regards,
{{merchant_name}}',
ARRAY['Shipped', 'Took Upsell'],
ARRAY['shipped', 'in_transit'],
61);

-- Chargeback
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, badges, order_status_hints, sort_order) VALUES
('Chargeback Notice: Shipped with Upsell', 'inquiry', 'Important: Chargeback Filed - Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>We received notice that a chargeback was filed with your bank for order {{order_number}}.</p><p><strong>Order Status:</strong> Shipped (Tracking: {{tracking_number}})<br><strong>Order Details:</strong> {{order_items}}</p><p>We want to resolve this directly with you instead of through the bank, as chargebacks can take 60-90 days and may result in fees.</p><p><strong>Can we help?</strong></p><ul><li>Was there an issue with your order?</li><li>Did you not receive the items?</li><li>Are you unhappy with the quality?</li></ul><p>Please respond within 48 hours so we can work this out together!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

We received notice that a chargeback was filed with your bank for order {{order_number}}.

Order Status: Shipped (Tracking: {{tracking_number}})
Order Details: {{order_items}}

We want to resolve this directly with you instead of through the bank, as chargebacks can take 60-90 days and may result in fees.

Can we help?
- Was there an issue with your order?
- Did you not receive the items?
- Are you unhappy with the quality?

Please respond within 48 hours so we can work this out together!

Best regards,
{{merchant_name}}',
ARRAY['Shipped', 'Chargeback', 'Took Upsell'],
ARRAY['shipped'],
70);

-- Expedited Processing
INSERT INTO email_templates (name, category, subject_line, body_html, body_plain, badges, order_status_hints, sort_order) VALUES
('Expedited Processing: Not Shipped', 'shipping', 'Re: Rush Processing for Order {{order_number}}',
'<p>Hi {{customer_first_name}},</p><p>I understand you need order {{order_number}} urgently.</p><p><strong>Current Status:</strong> Not yet shipped<br><strong>Standard Processing:</strong> 3-5 business days</p><p>I can expedite your order for rush processing (1-2 business days) for an additional fee of $[AMOUNT].</p><p>Would you like me to upgrade to expedited processing? Just confirm and I''ll process the upgrade right away!</p><p>Best regards,<br>{{merchant_name}}</p>',
'Hi {{customer_first_name}},

I understand you need order {{order_number}} urgently.

Current Status: Not yet shipped
Standard Processing: 3-5 business days

I can expedite your order for rush processing (1-2 business days) for an additional fee of $[AMOUNT].

Would you like me to upgrade to expedited processing? Just confirm and I''ll process the upgrade right away!

Best regards,
{{merchant_name}}',
ARRAY['Not Shipped', 'Expedited'],
ARRAY['pending', 'not_shipped'],
80);