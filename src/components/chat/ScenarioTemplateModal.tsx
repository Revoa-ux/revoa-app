import { useState, useEffect } from 'react';
import { X, Copy, Check, Mail, Package, RotateCcw, AlertCircle, Truck, FileCheck, MessageSquare, ThumbsUp, Sparkles, Link as LinkIcon, Search, Loader2, Shield, DollarSign, MapPin, AlertTriangle, Edit3, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface ScenarioTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId?: string;
  threadCategory?: string;
  orderId?: string;
  userId?: string;
  recipientEmail?: string;
  onSelectTemplate?: (template: { id: string; name: string }) => void;
}

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  subject: string;
  body: string;
  icon: any;
  color: string;
}

interface Order {
  id: string;
  order_number: string;
  shopify_order_id: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  total_price: number;
  currency: string;
  created_at: string;
}

const TEMPLATES: Template[] = [
  // PRODUCT ISSUES - Defective/Damaged/Quality
  {
    id: 'damaged_item_troubleshoot',
    name: 'Damaged Item - Request Evidence',
    category: 'damaged',
    description: 'Request photos/video of damage before offering resolution',
    subject: 'Regarding Your Order {{order_number}}',
    body: `Hello {{customer_first_name}},

We sincerely apologize for any inconvenience. While we do our best to ensure every order arrives in perfect condition, shipping and handling factors outside our control can sometimes cause issues.

To help us resolve this quickly, could you please send us clear photos or a short video showing the damaged item(s)? This will help our team assess the situation and determine the best solution for you.

Once we receive your photos/video, we'll get back to you right away with next steps.

Thank you for your patience and understanding.

Best regards,
{{merchant_store_name}}`,
    icon: AlertCircle,
    color: 'orange'
  },
  {
    id: 'defective_product_replacement_first',
    name: 'Defective Product - Offer Replacement',
    category: 'defective',
    description: 'Prioritize replacement over refund for defective items',
    subject: 'Resolution for Your Order {{order_number}}',
    body: `Hi {{customer_first_name}},

We sincerely apologize for the issue with your item from order #{{order_number}}. This definitely isn't the experience we want for our customers.

We'd like to make this right. Here are your options:

Option 1: Free Replacement (Recommended)
We'll send you a brand new replacement at no additional cost. This is typically the fastest way to get you the product you ordered.

Option 2: Return for Refund
If you prefer, we can process a return. Please note this would require shipping the item back to our warehouse, and a restocking fee may apply per our return policy.

We're here to help make this right. Which option works best for you?

Best regards,
{{merchant_store_name}}`,
    icon: AlertCircle,
    color: 'orange'
  },
  {
    id: 'quality_concern_troubleshoot',
    name: 'Quality Concern - Troubleshooting',
    category: 'quality',
    description: 'Guide customer through troubleshooting before offering replacement',
    subject: 'About Your Product Quality Concern',
    body: `Hey {{customer_first_name}},

Thanks for reaching out about your concerns with the product. I completely understand and I'm here to help.

Before we proceed, let's try a few quick troubleshooting steps to make sure everything is working as intended:

1. Please verify the product has been set up according to the instructions
2. Check that all connections/components are properly secured
3. Try the product in different conditions or settings if applicable

If after following these steps you're still experiencing issues, please send us photos or a short video showing the concern. This will help us better understand what's happening and determine the best solution.

We're committed to making sure you're completely satisfied with your purchase.

Let me know what you find!

Best regards,
{{merchant_store_name}}`,
    icon: AlertCircle,
    color: 'orange'
  },

  // RETURNS & EXCHANGES
  {
    id: 'return_inquiry_offer_alternatives',
    name: 'Return Inquiry - Offer Alternatives First',
    category: 'return',
    description: 'Understand reason and offer replacement before accepting return',
    subject: 'About Your Return Request',
    body: `Hey {{customer_first_name}},

Thank you for reaching out. Before we proceed with a return, may I ask what issue you're experiencing with the product?

If there's a problem with the item itself, we'd be happy to send you a replacement at no cost - this is usually much faster than processing a return and refund.

If you're simply not satisfied with the product and it's unused in original packaging, we can discuss return options. Please note that sale items may have different return policies, and a restocking fee applies to most returns as outlined in our policy.

Let me know what's going on and we'll find the best solution for you!

Best regards,
{{merchant_store_name}}`,
    icon: Package,
    color: 'yellow'
  },
  {
    id: 'return_instructions_with_fee',
    name: 'Return Instructions - With Restocking Fee',
    category: 'return',
    description: 'Provide complete return process with restocking fee',
    subject: 'Return Instructions for Order {{order_number}}',
    body: `Hey {{customer_first_name}},

I understand you'd like to return your items. Here's our return process:

Important: Items must be unused, in original condition, and in original packaging. After inspection, if items are deemed resellable, you'll receive a refund minus the {{restocking_fee}} restocking fee as stated in our return policy.

RETURN STEPS:

Step 1: Confirm Items
Reply to this email confirming exactly which items you're returning.

Step 2: Get Warehouse Entry Number
Wait for our reply with your unique "Warehouse Entry Number" (WEN).

Step 3: Ship to Warehouse
Return address: {{return_warehouse_address}}

CRITICAL: Write your WEN clearly on the OUTSIDE of the package near the shipping label.

Step 4: Include Documentation
Place a note INSIDE the package with:
• Your full name
• Order number: {{order_number}}
• Product names
• Quantity

Returns without this info may be rejected.

Step 5: Provide Tracking
Once shipped, reply with your tracking number so our warehouse team can watch for it.

Step 6: Inspection & Refund
After inspection (5-7 business days), we'll process your refund minus restocking fee if items are resellable.

Let me know when you're ready to proceed!`,
    icon: Package,
    color: 'red'
  },
  {
    id: 'return_provide_wen',
    name: 'Return - Provide Warehouse Entry Number',
    category: 'return',
    description: 'Give customer their WEN for approved return',
    subject: 'Your Warehouse Entry Number - {{order_number}}',
    body: `Hi {{customer_first_name}},

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

After our warehouse team inspects your return (5-7 business days after receipt), we'll process your refund minus the {{restocking_fee}} restocking fee.

Let me know if you have any questions!`,
    icon: Package,
    color: 'red'
  },
  {
    id: 'accidental_upsell_shipped',
    name: 'Accidental Upsell (Shipped)',
    category: 'upsell',
    description: 'Handle accidental upsell acceptance after shipping',
    subject: 'About Your Additional Item',
    body: `Hi {{customer_first_name}},

Thanks for reaching out. I can see a second item was added to your order through a post-purchase offer. I understand this may have been accidental - this happens occasionally.

Since your order has already shipped, here's what we can do:

Once you receive your package, simply reach back out and we'll process a no-cost return for the unwanted item. We'll make this as easy as possible for you and cover any return fees.

I'll make a note on your account so we can expedite this when you're ready.

Best regards,
{{merchant_store_name}}`,
    icon: Package,
    color: 'orange'
  },

  // DELIVERY EXCEPTIONS
  {
    id: 'package_returned_to_warehouse',
    name: 'Package Returned to Warehouse',
    category: 'delivery_exception',
    description: 'Offer reshipment as primary option for returned packages',
    subject: 'Your Package Was Returned to Us',
    body: `Hi {{customer_first_name}},

Our warehouse team has notified us that your package was returned by the carrier due to delivery issues.

We'd like to get this resolved for you right away. Here are your options:

Option 1: Reship to You (Recommended)
We can send your order out again at no additional cost. Please confirm:
• Your best shipping address
• A phone number (this helps the carrier contact you if needed)

Option 2: Process Refund
If you prefer, we can refund your order minus the {{restocking_fee}} restocking fee as outlined in our return policy, since the package has been returned to us.

The carrier attempted delivery multiple times and couldn't complete it. For future orders, we highly recommend including a phone number so carriers can reach you directly.

Please let us know how you'd like to proceed!

Best regards,
{{merchant_store_name}}`,
    icon: AlertTriangle,
    color: 'orange'
  },

  // ORDER STATUS
  {
    id: 'order_status_not_shipped',
    name: 'Order Status (Not Shipped)',
    category: 'order_status',
    description: 'Provide status for orders not yet shipped',
    subject: 'Order {{order_number}} Status Update',
    body: `Hello {{customer_first_name}},

Thank you for reaching out!  Your order {{order_number}} has been received and we are working on getting it shipped out.

Our processing time before an order ships is typical 1-3 days, excluding weekends.

We will email you a confirmation once it ships and that will include tracking information as well.

If you have any questions in the meantime, please don't hesitate to reach out.`,
    icon: Package,
    color: 'blue'
  },
  {
    id: 'order_status_shipped',
    name: 'Order Status (Shipped)',
    category: 'order_status',
    description: 'Provide tracking for shipped orders',
    subject: 'Your Order #{{order_number}} Has Shipped!',
    body: `Hello {{customer_first_name}},

Thanks for reaching out! Your order has shipped and I've included the information below so you can track it right to your door.

Order: {{order_number}}
Order Status Page: {{order_status_url}}

P.s. You should be receiving email updates to the same email you made your order with.

Please advise, you may need to check your spam folder.

You can also use the tracking page on our website to check on your live delivery status at anytime:
{{tracking_url}}`,
    icon: Truck,
    color: 'green'
  },
  {
    id: 'order_status_shipped_followup',
    name: 'Order Status (Shipped) - Follow Up',
    category: 'order_status',
    description: 'Reassure customer about shipping delays',
    subject: 'About Your Delivery',
    body: `{{customer_first_name}}, I checked in on your order delivery status and everything seems normal.

I understand you are excited and eager to receive your order and I wish I could give you an ETA.

It's possible the delivery company is backed up, unfortunately it's out of our control as they don't work for us, they have millions of packages to process.

Please allow the delivery company to process your package and update their system. You will receive updates in real time via email and you can always check our tracking page to see the live status of your delivery.

Thanks again for your patience and understanding, if I could make it move faster I would.`,
    icon: Truck,
    color: 'green'
  },
  {
    id: 'order_status_out_for_delivery',
    name: 'Order Status (Out for Delivery)',
    category: 'shipping',
    description: 'Notify customer package is out for delivery',
    subject: 'Your Package is Out for Delivery!',
    body: `Hello {{customer_first_name}},

Thanks for reaching out! Your order is out for delivery, I'll include the information below so you can track it right to your door.

You should be receiving email updates to the same email used during checkout from our system regarding delivery updates.

Please advise, you may need to check your spam folder.

You can track your order here on this page:
{{tracking_url}}`,
    icon: Truck,
    color: 'green'
  },
  {
    id: 'order_status_delivered_not_received',
    name: 'Order Status (Delivered, Not Received)',
    category: 'delivery_exception',
    description: 'Handle delivered but not received inquiries',
    subject: 'About Your Delivery',
    body: `Hello {{customer_first_name}},

I am sorry to hear that you have not received your order yet. I checked your order and it shows that it has been delivered:

{{tracking_status}}
Tracking #: {{tracking_number}}

There are times that tracking shows delivered but it doesn't get dropped off until the next day or so.

If you still haven't received after 2 business days since the status changed to delivered, please coordinate with the USPS/AU POST/CA POST with the above tracking number.

In the meantime, please don't hesitate to reach out if there is anything else we can help with.`,
    icon: AlertTriangle,
    color: 'yellow'
  },
  {
    id: 'delivered_2_days_not_located',
    name: 'Delivered > 2 Days (Not Received/Located)',
    category: 'delivery_exception',
    description: 'Handle packages marked delivered over 2 days ago',
    subject: 'About Your Package',
    body: `Hello {{customer_first_name}},

We do not have access to customer information with USPS. So please call them if you have trouble locating your package. I checked your order information on our end and it shows that it has been delivered:

{{tracking_status}}

Tracking #: {{tracking_number}}

Please call USPS directly as soon as possible for more assistance.`,
    icon: AlertTriangle,
    color: 'red'
  },

  // DELIVERY EXCEPTIONS
  {
    id: 'delivery_failed_returned',
    name: 'Delivery Failed (Returned to Sender)',
    category: 'delivery_exception',
    description: 'Handle packages being returned to sender',
    subject: 'Your Package is Being Returned',
    body: `Hello {{customer_first_name}},

I am sorry to hear that your order has started returning to us. Can you please call USPS/CA POST/AU POST as they only speak to receivers of packages not the sender (for security purposes).

Your tracking #: {{tracking_number}}

They will be able to coordinate with you regarding reverse the return and potentially correcting the address. Perhaps they just needed to contact you and couldn't at the time of delivery.

In the meantime, please don't hesitate to reach out if there is anything else we can help with.

Let me know if they cannot reverse it and I will send your order again immediately.`,
    icon: AlertTriangle,
    color: 'red'
  },
  {
    id: 'invalid_address_returned',
    name: 'Invalid Address - Package Returned',
    category: 'delivery_exception',
    description: 'Package returned due to address error, offer reship',
    subject: 'Address Issue - Order {{order_number}}',
    body: `Hey {{customer_first_name}},

Our fulfillment team has notified us that your package was returned due to an address error. The carrier wasn't able to complete delivery.

The address used during checkout was:
{{shipping_address_full}}

To get your order to you, please reply with your corrected shipping address. We'll reship your order at no additional cost and provide you with new tracking information.

Thank you for your patience!

Best regards,
{{merchant_store_name}}`,
    icon: MapPin,
    color: 'orange'
  },
  {
    id: 'delivery_failed_no_such_number',
    name: 'Delivery Failed - Invalid Address Number',
    category: 'delivery_exception',
    description: "Address number doesn't exist in postal system",
    subject: 'Delivery Issue - Order {{order_number}}',
    body: `Hi {{customer_first_name}},

The carrier has notified us that delivery failed due to: "No Such Number"

Your tracking number: {{tracking_number}}
Address on file: {{shipping_address_full}}

This usually means the street number doesn't exist in the postal system. Please contact the carrier directly to resolve this, or reply with a corrected address and we'll reship your order.

Carrier contact: {{carrier_phone_number}}

Let me know how you'd like to proceed!

Best regards,
{{merchant_store_name}}`,
    icon: AlertTriangle,
    color: 'red'
  },
  {
    id: 'delivery_failed_no_access',
    name: 'Delivery Failed - No Access',
    category: 'delivery_exception',
    description: "Carrier couldn't access delivery location",
    subject: 'Delivery Access Issue - Order {{order_number}}',
    body: `Hi {{customer_first_name}},

The carrier notified us that delivery failed due to: "No Access to Delivery Location"

Your tracking: {{tracking_number}}
Address: {{shipping_address_full}}

Please contact the carrier directly to arrange delivery, or if there's a better address, let us know and we can reship.

Carrier contact: {{carrier_phone_number}}

We're here to help get this resolved!

Best regards,
{{merchant_store_name}}`,
    icon: AlertTriangle,
    color: 'red'
  },
  {
    id: 'carrier_charge_on_package',
    name: 'Carrier Holding Package for Payment',
    category: 'delivery_exception',
    description: 'Carrier charging customer for unpaid balance',
    subject: 'About the Carrier Charge',
    body: `Hi {{customer_first_name}},

After investigating, I believe I understand what's happening with your package.

It appears you have an unpaid balance with the shipping carrier from a previous delivery. They've placed a collection notice on your current package to collect that outstanding balance.

Important: This charge is from the carrier, not from us or our company.

Looking at your tracking history, your package arrived at the local facility and was processed normally. The carrier then placed a "final notice" hold on it due to the unpaid balance from your previous package.

We have no affiliation with the carrier and no access to customer account information. For resolution, please contact them directly:

Carrier: {{carrier_name}}
Contact: {{carrier_phone_number}}

We're unable to intervene in carrier billing matters, but please let us know if there's anything else we can help with.

Best regards,
{{merchant_store_name}}`,
    icon: DollarSign,
    color: 'yellow'
  },

  // ADDRESS ISSUES
  {
    id: 'address_verification_before_shipping',
    name: 'Address Verification Before Shipping',
    category: 'address_issue',
    description: 'Confirm corrected address before fulfillment',
    subject: 'Please Confirm Your Shipping Address',
    body: `Hello {{customer_first_name}},

Thank you for your recent order #{{order_number}}!

Before we ship, we noticed a potential issue with your shipping address. We want to make sure your order gets to you without any problems.

Address you entered:
{{shipping_address_full}}

Suggested corrected address:
[CORRECTED ADDRESS TO BE INSERTED]

We've updated your order to use the corrected address above.

Please reply to confirm:
1. The corrected address is accurate
2. Your order items are correct

We'll wait for your confirmation before shipping to ensure everything is perfect!

Best regards,
{{merchant_store_name}}`,
    icon: MapPin,
    color: 'blue'
  },
  {
    id: 'edit_address_not_shipped',
    name: 'Edit Address (Not Shipped)',
    category: 'address_issue',
    description: 'Update address before shipment',
    subject: 'Address Updated',
    body: `Hi {{customer_first_name}},

Thank you for contacting us! I've updated your shipping address and you should be all set now. You will receive a confirmation email when your package ships. Let me know if there's anything else I can help with!`,
    icon: MapPin,
    color: 'green'
  },
  {
    id: 'edit_address_shipped',
    name: 'Edit Address (Shipped)',
    category: 'address_issue',
    description: 'Instructions for address changes after shipping',
    subject: 'About Changing Your Address',
    body: `Hi {{customer_first_name}}, you need to wait until you receive your "out for delivery" email from us. That email will provide you with a "last-mile" tracking number that will work with your local courier.

<<<INTERNAL NOTE>>>
USA : USPS
AU: Australian Post
Canada: Canada Post

Once you receive our email with this tracking code you need to call USPS/AU Post/CA Post as they will be able to intercept the routing for you.

We cannot do it for you as they will only speak with the receiver of the package for any adjustments.

We'll be here to assist you should you need any further help`,
    icon: MapPin,
    color: 'yellow'
  },

  // CANCELLATIONS & UPSELL REMOVAL
  {
    id: 'cancel_refund_not_shipped',
    name: 'Cancel & Refund Last Order (Not Shipped)',
    category: 'cancel',
    description: 'Cancel and refund order before shipping',
    subject: 'Order Cancelled',
    body: `Hello {{customer_first_name}},

I've canceled your last order, and issued a refund.`,
    icon: X,
    color: 'red'
  },
  {
    id: 'order_cancel_already_shipped',
    name: 'Order Change/Cancel: Already Shipped',
    category: 'cancel',
    description: 'Handle cancel request for shipped orders',
    subject: 'About Your Cancellation Request',
    body: `Hi {{customer_first_name}},

Thank you for reaching out to us.

Unfortunately, it looks like your order has already processed or shipped from our warehouse. Therefore, I am unable to make any changes to it at this time. You can simply refuse the package upon delivery, and once your online tracking information updates confirming that your set is being returned back to us, please let me know right away and I'll be happy to get an updated order sent out to you.

Please let me know if you have any questions in the meantime, {{customer_first_name}}`,
    icon: X,
    color: 'red'
  },
  {
    id: 'cancel_upsell_not_shipped',
    name: 'Cancel Upsell Item (Not Shipped)',
    category: 'upsell',
    description: 'Remove upsell before shipping',
    subject: 'Upsell Item Removed',
    body: `Hi {{customer_first_name}}, thanks for reaching out.

We've taken a look at your order and see that a second item was added through a special offer during checkout. No worries at all, this happens occasionally and we're happy to help.

We can absolutely remove the second purchase.

Your order has not shipped yet, so we've gone ahead and removed the second item and refunded you the difference. You'll receive a confirmation email shortly.`,
    icon: Edit3,
    color: 'green'
  },
  {
    id: 'cancel_upsell_fulfilled',
    name: 'Cancel Upsell Item (Fulfilled/Confirmed)',
    category: 'upsell',
    description: 'Attempt to reverse upsell after fulfillment',
    subject: 'About Your Upsell Item',
    body: `Hi {{customer_first_name}}, thanks for reaching out.

We've taken a look at your order and see that a second item was added through a special offer during checkout. No worries at all, this happens occasionally and we're happy to help.

Your order has already shipped, but we can still help! It seems it hasn't been passed off yet to the courier which means it might be reversible. Our team will get in contact with the logistics company to see if the package is reversible.

However if it is not reversible...once you receive it, we can guide you through our quick return process for a refund.`,
    icon: Edit3,
    color: 'yellow'
  },
  {
    id: 'cancel_upsell_shipped',
    name: 'Cancel Upsell Item (Shipped)',
    category: 'upsell',
    description: 'Return process for shipped upsell items',
    subject: 'About Your Upsell Item',
    body: `Hi {{customer_first_name}}, thanks for reaching out.

We've taken a look at your order and see that a second item was added through a special offer during checkout. No worries at all, this happens occasionally and we're happy to help.

We can absolutely remove the second purchase.

Your order has already shipped, but we can still help! Once you receive it, we can guide you through our quick return process for a refund.

Please reach out once you receive your package for next steps.`,
    icon: Package,
    color: 'orange'
  },

  // REFUNDS
  {
    id: 'full_refund_not_shipped',
    name: 'Full Refund (Not Shipped)',
    category: 'refund',
    description: 'Issue full refund before shipping',
    subject: 'Refund Processed',
    body: `Hello {{customer_first_name}},

I've refunded your last order {{order_number}}, please allow 3-5 business days for the refund to be processed. Reimbursement of funds will be allocated back to the original form of payment used for purchase. Thank you.`,
    icon: DollarSign,
    color: 'green'
  },
  {
    id: 'partial_refund_not_shipped',
    name: 'Partial Refund (Not Shipped)',
    category: 'refund',
    description: 'Issue partial refund before shipping',
    subject: 'Partial Refund Processed',
    body: `Hello {{customer_first_name}},

I've issued you a partial refund for your last order {{order_number}}, please allow 3-5 business days for the refund to be processed. Reimbursement of funds will be allocated back to the original form of payment used for purchase. Thank you.`,
    icon: DollarSign,
    color: 'green'
  },
  {
    id: 'expedited_processing_refund',
    name: 'Expedited Processing Complaint (Not Shipped)',
    category: 'refund',
    description: 'Refund expedited processing fee for delays',
    subject: 'Apology and Refund',
    body: `Hello {{customer_first_name}}, I am terribly sorry about the delay in processing your order and getting it out for delivery.

We are working hard to keep up with the demand of these products and we were a few days behind on processing orders. In the past week we added two new production lines to our manufacturing facility and with this we will now be able to get back on track and stay ahead of the demand!

However since we were late to ship your order, I went ahead and refunded you for the $5 you paid for expedited processing. As a way of saying sorry to you.

Please also be on the lookout for further emails regarding your order delivery status from us. We thank you dearly for being a customer.`,
    icon: DollarSign,
    color: 'orange'
  },
  {
    id: 'refund_shipping_tariff_delay',
    name: 'Refund Request/Shipping Complaint (Shipped) Tariff Delay',
    category: 'shipping',
    description: 'Address refund requests due to tariff delays',
    subject: 'About Your Delivery Delay',
    body: `Hello {{customer_first_name}},

Thank you for reaching out. You're right. Your package has oddly taken a long time to get to you.

I've noticed in this month many packages have been delayed up to twice the expected delivery time. Mainly due to U.S. customs, sorting centers and delivery facilities taking longer than expected to process and move packages along. I've spoke to our logistical partners and what they returned to me is that they are dealing with a backlog of millions of packages due to new adjustments caused by the new tariffs.

It has been a hard month for many online vendors and logistical companies and I am very sorry that this has caused your package to be delayed. However I believe your package is now at the delivery facility and USPS should have it out for delivery in no time.

You can track your order here:
{{tracking_url}}

P.s. if you'd like a refund we will have to start a return process which entails starting a return. Once you receive your order if you do wish to start a return just reach out and we'll be here to help. Thanks`,
    icon: Truck,
    color: 'yellow'
  },

  // CHARGEBACKS
  {
    id: 'chargeback_response_shipped',
    name: 'Chargeback Response - Order Shipped',
    category: 'chargeback',
    description: 'Respond to chargeback for shipped orders',
    subject: 'Regarding Your Chargeback - Order {{order_number}}',
    body: `Hello {{customer_first_name}},

We've been notified of a chargeback filed for order #{{order_number}}.

We've sent shipping confirmations to your email ({{customer_email}}) - please check your spam folder if you didn't receive them.

Order status:
• Shipped: {{shipped_date}}
• Ship to: {{shipping_address_full}}
• Tracking: {{tracking_url}}
• Order status: {{order_status_url}}

Our records show you haven't contacted us about any issues with this order. We're confident this may be a misunderstanding.

We strongly encourage you to contact your card issuer to reverse the chargeback. We'll be submitting evidence that this was a legitimate purchase.

Important information about chargebacks:
Chargebacks negatively impact both merchants and consumers. They affect your consumer score on the global payment network, which merchants and payment processors can see. This may result in difficulty making future online purchases as retailers may view you as high-risk. Many major platforms (including Shopify) assign fraud risk ratings based on chargeback history.

We're here to resolve any concerns. Please reach out if there's an issue we can help with.

Awaiting your response,
{{merchant_store_name}}`,
    icon: Shield,
    color: 'red'
  },
  {
    id: 'chargeback_response_delivered',
    name: 'Chargeback Response - Order Delivered',
    category: 'chargeback',
    description: 'Respond to chargeback for delivered orders',
    subject: 'Regarding Your Chargeback - Order {{order_number}}',
    body: `Hello {{customer_first_name}},

We've been notified of a chargeback filed for order #{{order_number}}.

We've sent both shipping and delivery confirmations to your email ({{customer_email}}) - please check your spam folder if you didn't receive them.

Order status:
• Status: DELIVERED
• Delivered to: {{shipping_address_full}}
• Tracking: {{tracking_url}}
• Order details: {{order_status_url}}

Our records show you haven't contacted us about any issues with this order. This appears to be a misunderstanding.

We strongly urge you to contact your card issuer to reverse the chargeback. We'll be submitting comprehensive evidence that this was a legitimate, completed transaction.

Critical information about chargebacks:
Chargebacks severely impact both merchants and consumers. Each chargeback negatively affects your consumer score on global payment networks. This score is visible to all merchants and payment processors, who use it to assess risk. Multiple chargebacks can result in:
• Inability to checkout on major e-commerce platforms
• Automatic order cancellations
• Payment method declines
• Being flagged as high-risk across the retail network

Major platforms like Shopify assign permanent fraud risk ratings based on chargeback history, which follows your payment information across all participating merchants.

We recommend reversing this chargeback immediately to protect your purchasing ability. If there's an actual issue with your order, please contact us and we'll resolve it properly.

Awaiting your response,
{{merchant_store_name}}`,
    icon: Shield,
    color: 'red'
  },
  {
    id: 'chargeback_followup_upsell',
    name: 'Chargeback Follow-up - Upsell Item',
    category: 'chargeback',
    description: 'Resolve chargeback involving accidental upsell',
    subject: 'Resolving Your Chargeback - Order {{order_number}}',
    body: `Hi {{customer_first_name}},

Thank you for getting back to me. I understand your concern and want to help resolve this.

You can track your order here: {{tracking_url}}

I've reviewed your order and noticed a second item was added through a post-purchase offer. I understand this may have been accidental - this happens occasionally and we're happy to help.

Normally, once you receive the item, we'd process a quick return and refund for the unwanted item.

However, with the chargeback filed, we can't process a refund (the funds have already been taken by your bank). To resolve this properly:

1. Contact your bank/card issuer to reverse the chargeback
2. Once reversed, we'll immediately process the return and refund for the unwanted item

The current situation has both the payment reversed AND the items shipping to you. By reversing the chargeback, we can properly return the unwanted item and issue the appropriate refund.

Let me know once you've contacted your bank and we'll get this resolved right away!

Best regards,
{{merchant_store_name}}`,
    icon: Shield,
    color: 'red'
  },
  {
    id: 'chargeback_followup_general',
    name: 'Chargeback Follow-up - General Resolution',
    category: 'chargeback',
    description: 'Follow up on chargeback to resolve issue',
    subject: 'Resolving Your Chargeback - Order {{order_number}}',
    body: `Hi {{customer_first_name}},

Thank you for responding. I want to help resolve this situation.

Track your order: {{tracking_url}}

I understand you may have concerns, but a chargeback wasn't necessary - we're always here to help resolve issues.

Your order has shipped. Normally, if you're unsatisfied once you receive it, we'd guide you through our return process for a proper refund.

However, with the chargeback filed, we cannot process returns or refunds (your bank has already taken the funds). To resolve this properly:

1. Contact your bank/card issuer to reverse the chargeback
2. Once reversed, we can process your return/refund through proper channels

The current situation has both the payment reversed AND items shipping to you. By reversing the chargeback, we can properly handle your return and issue an appropriate refund if needed.

We're here to help make this right. Please contact your bank and let me know once it's reversed.

Best regards,
{{merchant_store_name}}`,
    icon: Shield,
    color: 'red'
  }
];

const CATEGORY_LABELS: Record<string, string> = {
  damaged: 'Product Issues',
  defective: 'Product Issues',
  quality: 'Product Issues',
  order_status: 'Order Inquiries',
  shipping: 'Shipping & Delivery',
  delivery_exception: 'Delivery Issues',
  return: 'Returns & Exchanges',
  address_issue: 'Address Problems',
  cancel: 'Cancellations',
  upsell: 'Upsell Management',
  refund: 'Refunds',
  chargeback: 'Chargebacks'
};

export function ScenarioTemplateModal({
  isOpen,
  onClose,
  threadId,
  threadCategory,
  orderId,
  userId,
  recipientEmail,
  onSelectTemplate
}: ScenarioTemplateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isAssignedToOrder, setIsAssignedToOrder] = useState(false);
  const [populatedSubject, setPopulatedSubject] = useState('');
  const [populatedBody, setPopulatedBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showOrderSearch, setShowOrderSearch] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [selectedOrderForTemplate, setSelectedOrderForTemplate] = useState<string>('');

  const recommendedTemplates = threadCategory
    ? TEMPLATES.filter(t => t.category === threadCategory)
    : [];

  const otherTemplates = threadCategory
    ? TEMPLATES.filter(t => t.category !== threadCategory)
    : TEMPLATES;

  // Group templates by category for better organization
  const groupedTemplates = otherTemplates.reduce((acc, template) => {
    const categoryLabel = CATEGORY_LABELS[template.category] || template.category;
    if (!acc[categoryLabel]) {
      acc[categoryLabel] = [];
    }
    acc[categoryLabel].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  // Define category order for consistent display
  const categoryOrder = [
    'Product Issues',
    'Returns & Exchanges',
    'Order Inquiries',
    'Shipping & Delivery',
    'Delivery Issues',
    'Address Problems',
    'Cancellations',
    'Upsell Management',
    'Refunds',
    'Chargebacks'
  ];

  // Load orders when showing order search
  useEffect(() => {
    if (showOrderSearch && userId) {
      loadOrders();
    }
  }, [showOrderSearch, userId]);

  const loadOrders = async () => {
    if (!userId) return;

    setIsLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('shopify_orders')
        .select('id, order_number, shopify_order_id, customer_first_name, customer_last_name, customer_email, total_price, currency, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter out orders without customer information for better UX
      const ordersWithCustomers = (data || []).filter(order =>
        order.customer_first_name || order.customer_last_name || order.customer_email
      );

      setAllOrders(ordersWithCustomers);
      setOrders(ordersWithCustomers);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsAssignedToOrder(false);
    setPopulatedSubject(template.subject);
    setPopulatedBody(template.body);
  };

  const handleShowOrderSearch = () => {
    setShowOrderSearch(true);
  };

  const handleOrderSelection = async (selectedOrderId: string) => {
    setSelectedOrderForTemplate(selectedOrderId);
    setShowOrderSearch(false);
    await handleAssignToOrder(selectedOrderId);
  };

  const handleAssignToOrder = async (orderIdToUse?: string) => {
    const targetOrderId = orderIdToUse || orderId;

    if (!selectedTemplate || !targetOrderId) {
      toast.error('No order selected');
      return;
    }

    setIsLoading(true);
    try {
      // Fetch order data
      const { data: order, error: orderError } = await supabase
        .from('shopify_orders')
        .select('*')
        .eq('id', targetOrderId)
        .single();

      if (orderError) throw orderError;

      // Fetch merchant store name
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company')
        .eq('user_id', userId)
        .single();

      // Fetch tracking data if available
      const { data: tracking } = await supabase
        .from('shopify_order_fulfillments')
        .select('*')
        .eq('order_id', targetOrderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Build variables object
      const variables: Record<string, string> = {
        customer_first_name: order.customer_first_name || 'there',
        customer_last_name: order.customer_last_name || '',
        customer_email: order.customer_email || '',
        order_number: order.order_number || '',
        order_total: `$${order.total_price?.toFixed(2) || '0.00'}`,
        financial_status: order.financial_status || 'pending',
        fulfillment_status: order.fulfillment_status || 'unfulfilled',
        shipping_address_line1: order.shipping_address_line1 || '',
        shipping_address_line2: order.shipping_address_line2 || '',
        shipping_city: order.shipping_city || '',
        shipping_state: order.shipping_state || '',
        shipping_zip: order.shipping_zip || '',
        shipping_country: order.shipping_country || '',
        shipping_address_full: [
          order.shipping_address_line1,
          order.shipping_address_line2,
          `${order.shipping_city}, ${order.shipping_state} ${order.shipping_zip}`,
          order.shipping_country,
        ].filter(Boolean).join(', '),
        tracking_number: tracking?.tracking_number || '[TRACKING PENDING]',
        tracking_company: tracking?.tracking_company || 'YunExpress',
        tracking_url: tracking?.tracking_url || '[TRACKING URL PENDING]',
        tracking_status: tracking?.status || '[TRACKING STATUS PENDING]',
        last_mile_tracking_number: tracking?.last_mile_tracking_number || '[LOCAL TRACKING PENDING]',
        last_mile_carrier: tracking?.last_mile_carrier || 'USPS/Canada Post/Australia Post',
        order_status_url: `https://yourstore.com/orders/${order.shopify_order_id}`,
        shipped_date: tracking?.created_at ? new Date(tracking.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '[SHIP DATE PENDING]',
        merchant_store_name: profile?.company || 'Our Store',
        factory_name: 'Our Factory',
        logistics_provider: 'YunExpress',
        typical_delivery_days: '7-14 business days',
        return_warehouse_address: '5130 E. Santa Ana Street, Ontario, CA 91761',
        defect_coverage_days: '30 days',
        return_window_days: '30 days',
        replacement_ship_time_days: '3-5 business days',
      };

      // Replace variables in template
      let subject = selectedTemplate.subject;
      let body = selectedTemplate.body;

      Object.keys(variables).forEach((key) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        subject = subject.replace(regex, variables[key]);
        body = body.replace(regex, variables[key]);
      });

      setPopulatedSubject(subject);
      setPopulatedBody(body);
      setIsAssignedToOrder(true);
    } catch (error) {
      console.error('Error assigning to order:', error);
      toast.error('Failed to load order data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const emailContent = `Subject: ${populatedSubject}\n\n${populatedBody}`;
      await navigator.clipboard.writeText(emailContent);
      setCopied(true);
      toast.success('Email copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const renderTextWithVariables = (text: string) => {
    const parts = text.split(/(\{\{[^}]+\}\})/g);
    return parts.map((part, index) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        const variableName = part.slice(2, -2);
        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-mono"
          >
            <Sparkles className="w-3 h-3" />
            {variableName}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedTemplate ? selectedTemplate.name : 'Email Templates'}
            </h2>
            {selectedTemplate && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedTemplate.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedTemplate ? (
            <div className="p-6">
              {/* Recommended Templates */}
              {recommendedTemplates.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`h-px flex-1 ${
                      recommendedTemplates[0]?.color === 'red' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                      recommendedTemplates[0]?.color === 'orange' ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                      recommendedTemplates[0]?.color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-400' :
                      recommendedTemplates[0]?.color === 'green' ? 'bg-gradient-to-r from-green-500 to-green-400' :
                      recommendedTemplates[0]?.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                      recommendedTemplates[0]?.color === 'yellow' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                      'bg-gradient-to-r from-gray-500 to-gray-400'
                    }`}></div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                      Recommended for this thread
                    </h3>
                    <div className={`h-px flex-1 ${
                      recommendedTemplates[0]?.color === 'red' ? 'bg-gradient-to-l from-red-500 to-red-400' :
                      recommendedTemplates[0]?.color === 'orange' ? 'bg-gradient-to-l from-orange-500 to-orange-400' :
                      recommendedTemplates[0]?.color === 'purple' ? 'bg-gradient-to-l from-purple-500 to-purple-400' :
                      recommendedTemplates[0]?.color === 'green' ? 'bg-gradient-to-l from-green-500 to-green-400' :
                      recommendedTemplates[0]?.color === 'blue' ? 'bg-gradient-to-l from-blue-500 to-blue-400' :
                      recommendedTemplates[0]?.color === 'yellow' ? 'bg-gradient-to-l from-yellow-500 to-yellow-400' :
                      'bg-gradient-to-l from-gray-500 to-gray-400'
                    }`}></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recommendedTemplates.map((template) => {
                      const Icon = template.icon;
                      const colorClasses = {
                        red: {
                          border: 'border-red-500 dark:border-red-400',
                          bg: 'bg-red-50/30 dark:bg-red-900/10',
                          hover: 'hover:bg-red-50/50 dark:hover:bg-red-900/20',
                          iconBg: 'bg-red-50/40 dark:bg-red-900/20',
                          iconText: 'text-red-600 dark:text-red-400',
                          badge: 'bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        },
                        orange: {
                          border: 'border-orange-500 dark:border-orange-400',
                          bg: 'bg-orange-50/30 dark:bg-orange-900/10',
                          hover: 'hover:bg-orange-50/50 dark:hover:bg-orange-900/20',
                          iconBg: 'bg-orange-50/40 dark:bg-orange-900/20',
                          iconText: 'text-orange-600 dark:text-orange-400',
                          badge: 'bg-orange-100/50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                        },
                        purple: {
                          border: 'border-purple-500 dark:border-purple-400',
                          bg: 'bg-purple-50/30 dark:bg-purple-900/10',
                          hover: 'hover:bg-purple-50/50 dark:hover:bg-purple-900/20',
                          iconBg: 'bg-purple-50/40 dark:bg-purple-900/20',
                          iconText: 'text-purple-600 dark:text-purple-400',
                          badge: 'bg-purple-100/50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                        },
                        green: {
                          border: 'border-green-500 dark:border-green-400',
                          bg: 'bg-green-50/30 dark:bg-green-900/10',
                          hover: 'hover:bg-green-50/50 dark:hover:bg-green-900/20',
                          iconBg: 'bg-green-50/40 dark:bg-green-900/20',
                          iconText: 'text-green-600 dark:text-green-400',
                          badge: 'bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        },
                        blue: {
                          border: 'border-blue-500 dark:border-blue-400',
                          bg: 'bg-blue-50/30 dark:bg-blue-900/10',
                          hover: 'hover:bg-blue-50/50 dark:hover:bg-blue-900/20',
                          iconBg: 'bg-blue-50/40 dark:bg-blue-900/20',
                          iconText: 'text-blue-600 dark:text-blue-400',
                          badge: 'bg-blue-100/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        },
                        yellow: {
                          border: 'border-yellow-500 dark:border-yellow-400',
                          bg: 'bg-yellow-50/30 dark:bg-yellow-900/10',
                          hover: 'hover:bg-yellow-50/50 dark:hover:bg-yellow-900/20',
                          iconBg: 'bg-yellow-50/40 dark:bg-yellow-900/20',
                          iconText: 'text-yellow-600 dark:text-yellow-400',
                          badge: 'bg-yellow-100/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                        }
                      };
                      const colors = colorClasses[template.color as keyof typeof colorClasses];
                      return (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className={`p-4 border ${colors.border} ${colors.bg} rounded-lg ${colors.hover} hover:shadow-lg transition-all text-left group focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 p-2.5 rounded-lg ${colors.iconBg}`}>
                              <Icon className={`w-5 h-5 ${colors.iconText}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {template.name}
                                </h3>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${colors.badge} font-medium`}>
                                  Match
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                                {template.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Separator */}
              {recommendedTemplates.length > 0 && otherTemplates.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Browse All Templates
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
                  </div>
                </div>
              )}

              {/* Other Templates - Grouped by Category */}
              <div className="space-y-6">
                {categoryOrder.map((categoryLabel) => {
                  const templates = groupedTemplates[categoryLabel];
                  if (!templates || templates.length === 0) return null;

                  return (
                    <div key={categoryLabel}>
                      {/* Category Header */}
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          {categoryLabel}
                        </h4>
                        <div className="h-px bg-gradient-to-r from-gray-300 via-gray-200 to-transparent dark:from-gray-600 dark:via-gray-700 dark:to-transparent mt-2"></div>
                      </div>

                      {/* Templates in this category */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {templates.map((template) => {
                          const Icon = template.icon;
                          const colorClasses = {
                            red: {
                              hover: 'hover:border-red-500 dark:hover:border-red-400 hover:bg-red-50/30 dark:hover:bg-red-900/10',
                              iconBg: 'bg-red-50/40 dark:bg-red-900/20',
                              iconText: 'text-red-600 dark:text-red-400',
                              badge: 'bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                            },
                            orange: {
                              hover: 'hover:border-orange-500 dark:hover:border-orange-400 hover:bg-orange-50/30 dark:hover:bg-orange-900/10',
                              iconBg: 'bg-orange-50/40 dark:bg-orange-900/20',
                              iconText: 'text-orange-600 dark:text-orange-400',
                              badge: 'bg-orange-100/50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                            },
                            purple: {
                              hover: 'hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50/30 dark:hover:bg-purple-900/10',
                              iconBg: 'bg-purple-50/40 dark:bg-purple-900/20',
                              iconText: 'text-purple-600 dark:text-purple-400',
                              badge: 'bg-purple-100/50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                            },
                            green: {
                              hover: 'hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50/30 dark:hover:bg-green-900/10',
                              iconBg: 'bg-green-50/40 dark:bg-green-900/20',
                              iconText: 'text-green-600 dark:text-green-400',
                              badge: 'bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            },
                            blue: {
                              hover: 'hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10',
                              iconBg: 'bg-blue-50/40 dark:bg-blue-900/20',
                              iconText: 'text-blue-600 dark:text-blue-400',
                              badge: 'bg-blue-100/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            },
                            yellow: {
                              hover: 'hover:border-yellow-500 dark:hover:border-yellow-400 hover:bg-yellow-50/30 dark:hover:bg-yellow-900/10',
                              iconBg: 'bg-yellow-50/40 dark:bg-yellow-900/20',
                              iconText: 'text-yellow-600 dark:text-yellow-400',
                              badge: 'bg-yellow-100/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                            }
                          };
                          const colors = colorClasses[template.color as keyof typeof colorClasses];
                          return (
                            <button
                              key={template.id}
                              onClick={() => handleSelectTemplate(template)}
                              className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg ${colors.hover} transition-all text-left group focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`mt-1 p-2.5 rounded-lg ${colors.iconBg}`}>
                                  <Icon className={`w-5 h-5 ${colors.iconText}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                    {template.name}
                                  </h3>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                    {template.description}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Subject Line */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                  Subject Line
                </label>
                <div className="text-gray-900 dark:text-white font-medium">
                  {isAssignedToOrder ? populatedSubject : renderTextWithVariables(populatedSubject)}
                </div>
              </div>

              {/* Email Body */}
              <div className="flex-1 p-6 overflow-y-auto">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 block">
                  Email Body
                </label>
                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {isAssignedToOrder ? populatedBody : renderTextWithVariables(populatedBody)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            {/* Order Search Section - Fixed height, only shows when searching */}
            {!isAssignedToOrder && showOrderSearch && (
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 h-[420px] overflow-hidden">
                <div className="space-y-4 h-full flex flex-col">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select an Order
                    </label>
                    <button
                      onClick={() => setShowOrderSearch(false)}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 rounded px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>

                  {isLoadingOrders ? (
                    <div className="flex items-center justify-center flex-1">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : allOrders.length === 0 ? (
                    <div className="flex items-center justify-center flex-1">
                      <div className="text-center">
                        <Package className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No orders found</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search order number..."
                          autoFocus
                          onChange={(e) => {
                            const search = e.target.value.toLowerCase();
                            if (search) {
                              const filtered = allOrders.filter(order =>
                                order.order_number.toLowerCase().includes(search)
                              );
                              setOrders(filtered);
                            } else {
                              setOrders(allOrders);
                            }
                          }}
                          className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-800 dark:text-white text-sm transition-all"
                        />
                      </div>

                      {orders.length === 0 ? (
                        <div className="flex items-center justify-center flex-1">
                          <div className="text-center">
                            <Package className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No matching orders found</p>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-gray-300 dark:border-gray-600 rounded-lg flex-1 overflow-y-auto bg-white dark:bg-gray-800 shadow-sm">
                          {orders.map((order) => (
                            <button
                              key={order.id}
                              onClick={() => handleOrderSelection(order.id)}
                              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all border-b border-gray-200 dark:border-gray-700 last:border-b-0 text-left group focus:outline-none focus:bg-pink-50 dark:focus:bg-pink-900/20"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-pink-100 dark:group-hover:bg-pink-900/20 transition-colors">
                                  <Package className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors" />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-white text-base">
                                    {order.order_number}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {order.customer_first_name || order.customer_last_name ? (
                                      [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ')
                                    ) : order.customer_email ? (
                                      order.customer_email
                                    ) : (
                                      'Guest Customer'
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-pink-600 dark:text-pink-400">
                                  ${order.total_price?.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {new Date(order.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Action Footer - Always visible with consistent height */}
            <div className="px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  setIsAssignedToOrder(false);
                  setCopied(false);
                  setShowOrderSearch(false);
                }}
                className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Templates
              </button>

              <div className="flex items-center gap-4">
                {!isAssignedToOrder && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This template contains variables. Assign to an order to populate with real data.
                  </p>
                )}

                {isAssignedToOrder ? (
                  <button
                    onClick={handleCopyToClipboard}
                    className="group px-5 py-1.5 text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700 hover:shadow-md rounded-lg transition-all flex items-center gap-2 shadow-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy to Clipboard
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (orderId) {
                        handleAssignToOrder();
                      } else {
                        handleShowOrderSearch();
                      }
                    }}
                    disabled={isLoading}
                    className="group px-5 py-1.5 text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-2 shadow-sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <span>Populate Template</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
