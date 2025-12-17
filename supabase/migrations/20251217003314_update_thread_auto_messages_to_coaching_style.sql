/*
  # Update Thread Auto-Messages to Merchant Coaching Style

  ## Overview
  Transform all automated thread welcome messages from customer-facing language to
  merchant coaching language. These messages now act as an intelligent ecommerce coach
  helping merchants understand how to handle each type of customer issue.

  ## Changes
  Updates all existing messages in `thread_category_auto_messages` table to:
  - Speak to merchant as an ecommerce operations coach
  - Reference order data and customer sidebar information
  - Guide decision-making based on fulfillment status and configurations
  - Point to specific templates the merchant should use
  - Explain policies and processes from merchant's perspective
  - Include step-by-step workflows for complex scenarios

  ## Updated Categories
  - return: Complete WEN workflow with step-by-step instructions
  - replacement: Decision tree based on responsibility and scenarios
  - damaged: Coverage determination and carrier-specific guidance
  - defective: Factory coordination process with timeline expectations
  - inquiry: General coaching for unspecified issues

  ## Security
  No RLS changes - only updating existing message content
*/

-- =====================================================
-- UPDATE THREAD AUTO-MESSAGES
-- =====================================================

-- Return Request: Complete workflow with WEN generation and instructions
UPDATE thread_category_auto_messages
SET
  message_title = 'Return Workflow Guide',
  message_body = '**Step 1: Understand WHY They Want to Return**
Ask customer: "What''s the reason for the return?"

**This determines fees:**
• Changed mind / didn''t like it = **Customer pays return shipping**
• Defective / damaged / wrong item = **You cover return shipping**
• Your fault (quality, listing mismatch) = **You cover return + possible refund of original shipping**

**Step 2: Generate Warehouse Entry Number (WEN)**
You''ll need to create a WEN for tracking. This is critical - without it, the warehouse may reject the return.

Format: WEN-{{order_number}}-{{date}}
Example: WEN-1022-120625

**Step 3: Provide Return Instructions**
Use template: **[Return Instructions with WEN]**

This template will auto-fill:
• Your warehouse return address: {{warehouse_return_address}}
• The WEN they need to write on the package
• What to include inside the package

**Step 4: Important Reminders for Customer**
⚠️ Write WEN clearly on OUTSIDE of package
⚠️ Include note inside with: Name, order #, product names, quantity
⚠️ Returns without WEN or proper labeling may be rejected

**Step 5: Track the Return**
Once customer ships, add tracking number to this thread so you can monitor it.

**Refund Timing:** Only process refund AFTER warehouse confirms receipt and inspection.',
  updated_at = now()
WHERE category_tag = 'return';

-- Replacement Request: Decision tree based on who's responsible
UPDATE thread_category_auto_messages
SET
  message_title = 'Replacement Decision Guide',
  message_body = '**First, Understand What Happened:**
• Is item defective?
• Was item damaged in shipping?
• Did customer receive wrong item?
• Did customer order wrong thing?

**Replacement Options:**

**1. Free Replacement (Your Responsibility):**
When: Defective, damaged, wrong item, quality issue
Process: Ship replacement immediately, handle return separately

**2. Paid Replacement (Customer Error):**
When: Customer ordered wrong size/color/variant
Process: They can place new order, return original for refund

**3. Exchange:**
When: Customer wants different variant of same product
Process: Ship new variant, arrange return of original

**What to Ask Customer:**
• What exactly do they want to replace?
• Why do they need a replacement?
• What variant/size do they want instead?
• Photos (if quality issue)

**Next Steps:**
1. Determine if it''s a free replacement or customer pays
2. Check inventory for replacement item
3. Ship replacement (with tracking)
4. Handle return of original if needed

**Templates to Use:**
• **[Replacement - Free]** - For defects/errors
• **[Replacement - Exchange]** - For variant swaps
• **[Replacement - Customer Error]** - When they ordered wrong thing

**Factory Coordination:** If defect, contact {{product_factory_name}} to report and possibly claim.',
  updated_at = now()
WHERE category_tag = 'replacement';

-- Damaged Item: Coverage determination and carrier-specific guidance
UPDATE thread_category_auto_messages
SET
  message_title = 'Damaged Item Resolution Guide',
  message_body = '**Step 1: Gather Documentation**
Ask customer for:
• Photos of the damage (product AND outer packaging)
• Photos of shipping labels
• Description of the damage

**Step 2: Determine Who''s Responsible**
Check the order details → **Tracking Company:** {{tracking_company}}

**If Last-Mile Carrier (USPS, Canada Post, Australia Post):**
⚠️ Customer must file claim directly with carrier using their last-mile tracking number. You cannot file on their behalf.

**If Your Logistics Provider ({{logistics_provider}}):**
→ Check product config: Does {{logistics_provider}} cover damaged items?
• **If YES:** You can file claim and send replacement to customer
• **If NO:** Customer needs to file with {{logistics_provider}} directly

**Templates to Use:**
• **[Damage - Customer Claim Required]** - For last-mile carrier issues
• **[Damage - Provider Covered]** - If logistics partner covers it
• **[Damage - Replacement Process]** - After determining coverage

**Timeline Note:** Carrier claims can take {{typical_claim_time}} to process. Set customer expectations.

**Your Customer''s Experience:** Make this as easy as possible - provide all tracking numbers and contact info they need.',
  updated_at = now()
WHERE category_tag = 'damaged';

-- Defective Product: Factory coordination with coverage period
UPDATE thread_category_auto_messages
SET
  message_title = 'Defect Claim Process',
  message_body = '**Check Coverage Period:**
Product defect coverage: **{{product_defect_coverage_days}} days** from delivery
Order delivered: **{{days_since_delivery}} days ago**

**Status:** [Coverage Active / Coverage Expired]

**What to Ask Customer:**
• What''s defective? (be specific - doesn''t turn on, broke after X uses, etc.)
• Photos or video showing the defect
• When did they first notice the issue?

**Next Steps:**
1. Review their documentation
2. Contact factory for assessment: **{{product_factory_name}}**
   - Email: {{factory_contact_email}}
   - Include: Photos, order date, customer description
3. Wait for factory decision (usually {{factory_response_time}})

**Possible Resolutions:**
• Replacement shipped by factory
• Full refund (if not fixable)
• Repair instructions (if applicable)
• Partial refund for minor defects

**Templates to Use:**
• **[Defect - Gathering Info]** - Initial response to customer
• **[Defect - Factory Reviewing]** - While waiting on factory
• **[Defect - Replacement Approved]** - After factory approves
• **[Defect - Refund Approved]** - If refund instead

**Important:** If coverage expired, customer may still be entitled to statutory warranty depending on location.',
  updated_at = now()
WHERE category_tag = 'defective';

-- General Inquiry: Coaching for unspecified issues
UPDATE thread_category_auto_messages
SET
  message_title = 'General Inquiry Guide',
  message_body = '**Start By Understanding What They Need:**
Common inquiry types:
• Order status / tracking information
• Product questions or specifications
• Delivery timeline concerns
• General customer service

**Information to Have Ready:**
Check the Customer Sidebar for:
• Order status and fulfillment details
• Tracking information
• Customer''s full order history
• Any previous communications

**Best Practices:**
1. Ask clarifying questions to understand the specific need
2. Reference order details to show you''re informed
3. Be proactive - anticipate follow-up questions
4. Use templates for common scenarios

**Template Library:**
Browse the scenario templates to find relevant responses for:
• Order updates
• Product information
• Shipping questions
• General customer service

**Order Information:**
• Order #: {{order_number}}
• Status: {{fulfillment_status}}
• Tracking: {{tracking_number}}

**Tip:** The faster you can identify what they actually need, the faster you can resolve it. Don''t be afraid to ask direct questions.',
  updated_at = now()
WHERE category_tag = 'inquiry';

-- Add new auto-messages for categories that didn't exist before

-- Cancel/Modify Order
INSERT INTO thread_category_auto_messages (category_tag, message_title, message_body, display_order, is_active)
VALUES (
  'cancel_modify',
  'Cancel/Modify Order Guide',
  '**What to Check First:**
• Look at the Order Status in the sidebar → Is it shipped yet?
• Check fulfillment status to see if changes are still possible

**If NOT Shipped:**
✓ Full cancellation available - Process refund after canceling
✓ Address changes usually possible - Contact {{logistics_provider}}
✓ Item modifications may be possible - Check with warehouse

**If Already Shipped:**
✗ Cancellation not possible - Must process as a return
✗ Address changes limited - Depends on carrier and location

**What to Ask Your Customer:**
1. What specific changes do they want?
2. Is it urgent? (helps prioritize with fulfillment team)

**Templates to Use:**
• **[Cancel Order - Not Shipped]** - For pre-fulfillment cancellations
• **[Order Modification - Address]** - For address changes
• **[Return After Shipment]** - If already shipped

**Policy Reminder:** Customer-requested changes are fee-free if order hasn''t shipped yet.',
  6,
  true
) ON CONFLICT (category_tag) DO UPDATE SET
  message_title = EXCLUDED.message_title,
  message_body = EXCLUDED.message_body,
  updated_at = now();

-- Wrong Item Received
INSERT INTO thread_category_auto_messages (category_tag, message_title, message_body, display_order, is_active)
VALUES (
  'wrong_item',
  'Wrong Item Resolution Guide',
  '**What to Gather from Customer:**
• Photos of the item they received (show label/packaging)
• What item they ordered vs. what they got
• Order confirmation screenshot (optional but helpful)

**How to Resolve:**
1. Verify the error by checking their order in Shopify
2. Ship the correct item immediately (expedited if possible)
3. Provide prepaid return label for wrong item

**Templates to Use:**
• **[Wrong Item - Gathering Info]** - Ask for photos first
• **[Wrong Item - Resolution]** - After you verify and ship correct item

**Warehouse Note:** If this is a pattern, reach out to your fulfillment team to investigate the root cause.

**Your Customer''s Experience:** They should get the correct item ASAP without any hassle or additional cost. This was your mistake, so make it easy for them.',
  7,
  true
) ON CONFLICT (category_tag) DO UPDATE SET
  message_title = EXCLUDED.message_title,
  message_body = EXCLUDED.message_body,
  updated_at = now();

-- Missing Items
INSERT INTO thread_category_auto_messages (category_tag, message_title, message_body, display_order, is_active)
VALUES (
  'missing_items',
  'Missing Items Resolution Guide',
  '**What to Ask Your Customer:**
• What items were supposed to be in the package?
• What items did they actually receive?
• Photos of everything they got (including packaging)

**How to Verify:**
1. Pull up the order in Shopify - check what was supposed to ship
2. Check the packing list/slip if customer has it
3. Review photos to confirm what''s missing

**Resolution Steps:**
1. Ship missing items immediately at no charge to customer
2. Use expedited shipping if it was a significant portion of order
3. Consider a goodwill gesture (discount code) for the inconvenience

**Templates to Use:**
• **[Missing Items - Gathering Info]** - Initial response
• **[Missing Items - Shipping Replacement]** - After you confirm and ship

**Warehouse Follow-Up:** Report this to your fulfillment team to prevent future issues.',
  8,
  true
) ON CONFLICT (category_tag) DO UPDATE SET
  message_title = EXCLUDED.message_title,
  message_body = EXCLUDED.message_body,
  updated_at = now();

-- Shipping/Delivery Issues
INSERT INTO thread_category_auto_messages (category_tag, message_title, message_body, display_order, is_active)
VALUES (
  'shipping',
  'Shipping Issue Resolution Guide',
  '**Common Issues You Can Help With:**
• Tracking not updating → Check carrier website directly
• Delivery estimate → Typical time is {{typical_delivery_days}}
• Package appears stuck → May need carrier intervention
• Delivery attempted but missed → Arrange redelivery
• Package lost → File claim after {{lost_package_days}} days

**What to Check:**
→ **Fulfillment Status:** {{fulfillment_status}}
→ **Tracking Number:** {{tracking_number}}
→ **Last Update:** {{last_tracking_update}}

**What to Ask Customer:**
• What specifically are they concerned about?
• Have they checked the tracking link?
• Is there a delivery deadline they''re worried about?

**Templates to Use:**
• **[Shipping - Status Update]** - General tracking info
• **[Shipping - Delayed Package]** - If stuck or late
• **[Shipping - Lost Package]** - For filing claims
• **[Shipping - Delivery Issues]** - For missed deliveries

**Pro Tip:** Check the carrier''s website yourself before responding. Sometimes tracking is more detailed there than what you see in Shopify.',
  9,
  true
) ON CONFLICT (category_tag) DO UPDATE SET
  message_title = EXCLUDED.message_title,
  message_body = EXCLUDED.message_body,
  updated_at = now();

-- Refund Request
INSERT INTO thread_category_auto_messages (category_tag, message_title, message_body, display_order, is_active)
VALUES (
  'refund',
  'Refund Request Decision Guide',
  '**First, Understand the Situation:**
Ask customer:
• Why are they requesting a refund?
• Did they receive the item(s)?
• What condition is the item in?

**Refund Scenarios:**

**1. Item Not Received / Lost in Transit:**
→ Verify tracking shows non-delivery
→ Full refund appropriate after {{lost_package_days}} days

**2. Customer Wants Return:**
→ Must follow return process first (see Return category)
→ Refund only AFTER warehouse receives and inspects
→ May deduct return shipping if customer''s choice

**3. Defective / Wrong Item:**
→ Full refund including original shipping
→ May not require return (your call)

**4. Partial Refund:**
→ For minor issues customer is willing to keep item for
→ Negotiate reasonable amount

**What to Check:**
• Order status in Shopify
• Product condition from customer photos
• Your return/refund policy for this product
• Who''s at fault (you vs. customer preference)

**Templates to Use:**
• **[Refund - Item Not Received]** - For lost packages
• **[Refund - After Return]** - Once return processed
• **[Refund - Partial Offer]** - For keep-with-discount scenarios

**Policy Reminder:** Only process refunds after verifying the reason is valid per your terms.',
  10,
  true
) ON CONFLICT (category_tag) DO UPDATE SET
  message_title = EXCLUDED.message_title,
  message_body = EXCLUDED.message_body,
  updated_at = now();
