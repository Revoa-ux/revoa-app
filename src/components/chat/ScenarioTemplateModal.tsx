import { useState, useEffect } from 'react';
import { X, Copy, Check, Mail, Package, RotateCcw, AlertCircle, Truck, FileCheck, MessageSquare, ThumbsUp, Sparkles, Link as LinkIcon, Search, Loader2, Shield, DollarSign, MapPin, AlertTriangle, Edit3 } from 'lucide-react';
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
  // REPLACEMENT & DAMAGED ITEMS
  {
    id: 'replacements_damaged',
    name: 'Replacements (Damaged Items)',
    category: 'damaged',
    description: 'Request testing and offer replacement for damaged items',
    subject: 'Regarding Your Order {{order_number}}',
    body: `Hello {{customer_first_name}},

We apologize for the inconvenience. As we try our best to provide exceptional service, some factors like shipping and handling are outside of our control, and issues like this can happen.

Can you please make sure that the lights have been given a full day of sunlight to charge and that the button (if any) is pressed and set to "on".

After 1 full day of charge and testing the button if you still notice one or two of the lights are not working...please send us a video of the broken/damaged item(s) you received and we'll do our best to resolve this as soon as possible.`,
    icon: AlertCircle,
    color: 'orange'
  },
  {
    id: 'defective_product',
    name: 'Defective Product Resolution',
    category: 'defective',
    description: 'Address a defective product complaint',
    subject: 'Resolution for Your Defective Item - Order {{order_number}}',
    body: `Hi {{customer_first_name}},

We sincerely apologize for the defective item you received with order #{{order_number}}.

We'd like to make this right. Please choose your preferred resolution:

Option 1: Full Refund
We can issue a full refund to your original payment method.

Option 2: Replacement
We can send you a replacement item at no additional cost.

Our defect coverage: {{defect_coverage_days}}

Please let us know which option you prefer, and we'll process it immediately.

Again, we apologize for the inconvenience.

Best regards,
{{merchant_store_name}}`,
    icon: AlertCircle,
    color: 'purple'
  },

  // QUALITY COMPLAINTS
  {
    id: 'quality_complaint',
    name: 'Quality Complaint (Not Bright Enough)',
    category: 'quality',
    description: 'Address product brightness concerns with troubleshooting',
    subject: 'About Your Lights',
    body: `Hey {{customer_first_name}},

Thanks for sharing your concerns with us about your lights.

Your solar fence lights/solar step lights are 5/3 lumens each and contain batteries with 300mAh that are charged by daily sun exposure. Each day will have different amounts of cloud coverage and sun exposure to your yard which may affect the lights when they come on at night. The placement of your lights can also affect sun exposure (ie: tree shade, fence posts, house shade, landscaping coverage, etc.).

With that being said, if you have concerns about the quality of your lights, please send us some videos of the lights after dusk and after they've had a full two days of sun exposure.

From there we can help investigate further with you.

Let us know if you have any questions.`,
    icon: AlertCircle,
    color: 'orange'
  },

  // RETURNS
  {
    id: 'return_need_reason',
    name: 'Return (Need Reason)',
    category: 'return',
    description: 'Ask for return reason before processing',
    subject: 'About Your Return Request',
    body: `Hey {{customer_first_name}}, may I ask the reason for your return? Typically with any sale items we wouldn't process a return/refund, however we may consider your request if the items are unused, in the same condition as when you received them, and in original packaging. In which case we'd ask you to send them to our return warehouse. If there are any issues with the items you've received please send photos so our team can examine and if needed, send replacements.`,
    icon: Package,
    color: 'red'
  },
  {
    id: 'return_need_confirm',
    name: 'Return (Need Confirm)',
    category: 'return',
    description: 'Request confirmation before providing return instructions',
    subject: 'Return Request for Order {{order_number}}',
    body: `Hey {{customer_first_name}}, typically with any sale items we wouldn't process a return/refund, however if the items are unused, in the same condition as when you received them, and in original packaging you can send them to our return warehouse.

After we have inspected them and deemed them as resell-able we will provide you a refund minus the restocking fee of $39 (as stated on our website return and refund policy page).

Here are the next steps.

Step (1)
Confirm the items you'd like to return by replying to this email.

Step (2)
Wait for our reply, we will provide you with a "Warehouse Entry Number"

Step (3)
Return your package to this address:
5130 E. Santa Ana Street, Ontario, CA 91761

Clearly write your unique "Warehouse Entry Number" on the outside of the package near the shipping label.

In addition to this, you will need to include a note inside the package with:

Your full name
Your order number
Product name(s)
Quantity (number of boxes, not individual units)

Returns sent without this information or to the wrong address may be rejected or discarded by the warehouse.

Step (4)
Once they are sent, let us know and provide a tracking number so our warehouse team can be notified.

Step (5)
Our warehouse team will inspect and if items are resell-able your order will be refunded minus the restocking fee.`,
    icon: Package,
    color: 'red'
  },
  {
    id: 'return_need_wen',
    name: 'Return Email 2 (Need WEN)',
    category: 'return',
    description: 'Provide warehouse entry number for approved returns',
    subject: 'Your Warehouse Entry Number',
    body: `Hey {{customer_first_name}}, typically with any sale items we wouldn't process a return/refund, however if the items are unused, in the same condition as when you received them, and in original packaging then you can send them to our return warehouse.

After we have inspected them and deemed them as resell-able we will provide you a refund minus the restocking fee of $39 (as stated on our website return and refund policy page).

Here are the next steps.

Step (1)
Confirm the items you'd like to return by replying to this email.

Step (2)
Wait for our reply, we will provide you with a "Warehouse Entry Number"

Step (3)
Return your package to this address:
5130 E. Santa Ana Street, Ontario, CA 91761

Clearly write your unique "Warehouse Entry Number" on the outside of the package near the shipping label.

In addition to this, you will need to include a note inside the package with:
Your full name
Your order number
Product name(s)
Quantity (number of boxes, not individual units)
Returns sent without this information or to the wrong address may be rejected or discarded by the warehouse.

Step (4)
Once they are sent, let us know and provide a tracking number so our warehouse team can be notified.

Step (5)
Our warehouse team will inspect and if items are resell-able your order will be refunded minus the restocking fee.`,
    icon: Package,
    color: 'red'
  },
  {
    id: 'return_upsell_shipped',
    name: 'Return/Refund Upsell (Shipped)',
    category: 'upsell',
    description: 'Handle accidental upsell returns',
    subject: 'About Your Order',
    body: `Hi {{customer_first_name}}, it seems you accidentally accepted a special offer on our thank you page post-purchasing. You clicked the black button that says "pay now" and not "decline this offer".

That's alright and we are here to help. Once you receive the items please reach back out to us via this email thread so we can start the return process at no cost to you.`,
    icon: Package,
    color: 'orange'
  },
  {
    id: 'returned_to_warehouse',
    name: 'Returned To Warehouse (USA/USPS)',
    category: 'delivery_exception',
    description: 'Handle packages returned to warehouse',
    subject: 'Your Package Was Returned',
    body: `Hi {{customer_first_name}},

Our warehouse team has confirmed that your package has been returned to us. At this point, you have two options:
We can reship your order to you – simply confirm the best shipping address and contact number so the carrier can reach you if needed.
We can issue a refund – this will be processed back to your original payment method, minus the $39 restocking fee as outlined in our return policy.
Please note, USPS made multiple delivery attempts and marked the package undeliverable as they were unable to reach you. We also sent automated delivery exception emails during this time. For future orders, including a phone number is recommended so the shipping carrier can contact you directly if there are any address issues.

Kindly reply to let us know how you'd like to proceed. We won't process the refund until we hear back from you with your preference.`,
    icon: AlertTriangle,
    color: 'red'
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
    id: 'delivery_exception_invalid_address',
    name: 'Delivery Exception (Returned) - Invalid Address',
    category: 'delivery_exception',
    description: 'Package returned due to invalid address',
    subject: 'Package Returned to Warehouse (Invalid Address)',
    body: `Hey {{customer_first_name}}, Julie here with NordikHome.

My fulfillment team notified me that there was an error in your shipping address used during checkout. It must have confused the currier and it got sent back to our warehouse.

Please update us with a more accurate address for the new delivery. Afterwards we can provide you with a new tracking code.

For reference, this is the address you completed checkout with: {{shipping_address_full}}.

Thank you`,
    icon: MapPin,
    color: 'red'
  },
  {
    id: 'package_undelivered_no_such_number',
    name: 'Package Undelivered (No Such Number)',
    category: 'delivery_exception',
    description: 'Package failed delivery - no such number',
    subject: 'Delivery Issue with Your Package',
    body: `Hi {{customer_first_name}}, we've been notified by the postal service that your package failed to be delivered due to: No Such Number

Can you please contact USPS to arrange a proper delivery: 1-800-275-8777
Your tracking number: {{tracking_number}}

For reference this is the address you used at checkout: {{shipping_address_full}}`,
    icon: AlertTriangle,
    color: 'red'
  },
  {
    id: 'package_undelivered_no_access',
    name: 'Package Undelivered (No Access to Delivery Location)',
    category: 'delivery_exception',
    description: 'Package failed delivery - no access',
    subject: 'Delivery Issue with Your Package',
    body: `Hi {{customer_first_name}}, we've been notified by the postal service that your package failed to be delivered due to: No Access to Delivery Location.

Can you please contact USPS to arrange a proper delivery: 1-800-275-8777
Your tracking number: {{tracking_number}}

For reference, this is the address you completed checkout with: {{shipping_address_full}}`,
    icon: AlertTriangle,
    color: 'red'
  },
  {
    id: 'usps_charged_customer',
    name: 'USPS Charged Customer (Unpaid Package)',
    category: 'delivery_exception',
    description: 'USPS holding package for unpaid balance',
    subject: 'About the USPS Charge',
    body: `Hi {{customer_first_name}}, after further investigation I think I can understand what happened here..

It looks like you had an un-paid balance with USPS and they put this collection on your package in order to receive their un-paid balance from a previous package of yours.

This charge was from a previous package you received. This charge has nothing to do with us or our company.

Upon checking on your tracking history, I can see that it was only in your state recently, it was shipped right away the next day. The USPS hub is a big facility where packages arrive and are sorted to be shipped to your local state.
It looks like they placed this "final notice bill" on your package since it was an overdue payment and they wanted to ensure you paid the bill and thus held your package from you.

If you have concerns about this matter please contact USPS directly. We have no affiliation with them and no access to customer records with the United States Postal Service.

Again, this final notice charge is from USPS, not us.

Have a wonderful rest of your day.`,
    icon: DollarSign,
    color: 'yellow'
  },

  // ADDRESS ISSUES
  {
    id: 'address_issue_need_confirm',
    name: 'Address Issue (Need Confirm)',
    category: 'address_issue',
    description: 'Confirm address before shipping',
    subject: 'Please Confirm Your Shipping Address',
    body: `Hello {{customer_first_name}}, thank you so much for your recent purchase on nordikhome.com.

We noticed that your address might have a potential issue and we wanted to confirm your order with you before shipping.

The shipping address used to checkout on your order {{order_number}} is: {{shipping_address_full}}.

However the suggested address to use is:
[SUGGESTED ADDRESS]

I have updated it to the above address.

We will wait to fulfill until getting confirmation from you that both the updated address above is correct, as well the items in your order:

[Items list]

Please reply and confirm the items you ordered and the updated shipping address are both correct.`,
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
    id: 'chargeback_shipped',
    name: 'Chargeback (Shipped) - Never Contacted Us',
    category: 'chargeback',
    description: 'Respond to chargeback for shipped orders',
    subject: 'About Your Chargeback',
    body: `Hello {{customer_first_name}}, Tyler here with NordikHome. We saw that you submitted a chargeback regarding your order on our website nordikhome.com. Order {{order_number}}. We have sent you shipping confirmation emails to the email address that you placed your order with: {{customer_email}}.

If you did not receive our emails please check your spam folder.

Regarding your order, it is on its way to you. It was shipped on {{shipped_date}} to the address you inputted during checkout: {{shipping_address_full}}.

You can review the status of your order here: {{order_status_url}}.

You can also track your order here: {{tracking_url}}

We have searched our emails and noticed you never reached out regarding any issues with your order. Surely the chargeback is only a mistake.

We hope that you call your card issuer or bank to reverse the chargeback. We will be submitting our evidence that this purchase was non-fraudulent.

Please note:
Chargebacks hurt merchants as well as online consumers. Each time you chargeback it effects your score as a consumer on the global processing network, in which us merchants (as well as the payment processors we use) can see upon your purchase to determine if we should accept your payment or fulfill your order. Particularly, Shopify gives a fraud risk rating to your online profile attached to your card and various other data points. Seeing a history of chargebacks puts you in a risk category to other merchants globally. So my recommendation is to reverse it to keep your order risk level low.

I will await your response`,
    icon: Shield,
    color: 'red'
  },
  {
    id: 'chargeback_delivered',
    name: 'Chargeback (Delivered) - Never Contacted Us',
    category: 'chargeback',
    description: 'Respond to chargeback for delivered orders',
    subject: 'About Your Chargeback',
    body: `Hello {{customer_first_name}}, Tyler here with NordikHome. We saw that you submitted a chargeback regarding your order on our website nordikhome.com. Order {{order_number}}. We have sent you shipping confirmation emails as well as a delivery confirmation email to the email address that you placed your order with: {{customer_email}}.

If you did not receive our emails please check your spam folder.

Regarding your order, it has already been delivered to you. It was shipped to the address you inputted during checkout: {{shipping_address_full}}.

For further proof, you can review the status of your order here: {{order_status_url}}.

You can also track your order here: {{tracking_url}}

We have searched our emails and noticed you never reached out regarding any issues with your order.

Surely the chargeback is only a mistake.

We hope that you call your card issuer or bank to reverse the chargeback. We will be submitting our evidence that this purchase was non-fraudulent.

Please note:
Chargebacks hurt merchants as well as online consumers. Each time you chargeback it effects your score as a consumer on the global processing network, in which us merchants (as well as the payment processors we use) can see upon your purchase to determine if we should accept your payment or fulfill your order. Particularly, Shopify gives a fraud risk rating to your online profile attached to your card and various other data points. Seeing a history of chargebacks puts you in a risk category to other merchants globally, and thus you'll likely not be able to checkout on popular website you may shop on.

So my recommendation is to reverse it to keep your order risk level low.`,
    icon: Shield,
    color: 'red'
  },
  {
    id: 'chargeback_shipped_upsell',
    name: 'Chargeback Email 2 (Shipped, Took Upsell)',
    category: 'chargeback',
    description: 'Handle chargeback with upsell item',
    subject: 'About Your Chargeback - Follow Up',
    body: `Hi {{customer_first_name}}, I understand your concern. Thanks for getting back to me. As I've previously shared with you, you can track the whereabouts and the journey of your delivery here:

{{tracking_url}}

You could have always reached out. A chargeback was not necessary. But I understand, and hope to resolve this with you.

I've taken a look at your order and see that a second item was added through a special offer during checkout. No worries at all — this happens occasionally and I am happy to help you return the second purchase.

Your order has already shipped. Normally once you've received it, I'd guide you through our quick return process for a refund.

However since you have chargedback this isn't possible. You will need to call your bank/card issuer and reverse the chargeback first before I can refund you.

The problem now is that you have the money and the items. By reversing the chargeback we can properly go about this and return the unwanted items and process the refund.

Let me know when/if you've reversed the chargeback and we can go from there. Thanks!`,
    icon: Shield,
    color: 'red'
  },
  {
    id: 'chargeback_shipped_followup',
    name: 'Chargeback Email 2 (Shipped)',
    category: 'chargeback',
    description: 'Follow up on chargeback for shipped order',
    subject: 'About Your Chargeback - Follow Up',
    body: `Hi {{customer_first_name}}, I understand your concern. Thanks for getting back to me. As I've previously shared with you, you can track the whereabouts and the journey of your delivery here:

{{tracking_url}}

You could have always reached out. A chargeback was not necessary. But I understand, and hope to resolve this with you.

Your order has already shipped. Normally once you've received it, I'd guide you through our quick return process for a refund.

However since you have chargedback this isn't possible. You will need to call your bank/card issuer and reverse the chargeback first before I can refund you (as they have taken the funds).

The problem now is that you have both the money and the items. By reversing the chargeback we can go about this properly to return the unwanted items and process your refund.

Let me know when/if you've reversed the chargeback and we can go from there. Thanks!`,
    icon: Shield,
    color: 'red'
  }
];

const CATEGORY_LABELS: Record<string, string> = {
  replacement: 'Replacement',
  return: 'Returns',
  defective: 'Defective',
  damaged: 'Damaged',
  shipping: 'Shipping',
  order_status: 'Order Status',
  order_changes: 'Order Changes',
  delivery_exception: 'Delivery Issue',
  chargeback: 'Chargeback',
  refund: 'Refund',
  address_issue: 'Address Issue',
  quality: 'Quality Issue',
  upsell: 'Upsell Item',
  cancel: 'Cancellation'
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
      setAllOrders(data || []);
      setOrders(data || []);
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
                          bg: 'bg-red-50 dark:bg-red-900/20',
                          hover: 'hover:bg-red-100 dark:hover:bg-red-900/30',
                          iconBg: 'bg-red-100 dark:bg-red-900/30',
                          iconText: 'text-red-600 dark:text-red-400',
                          badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        },
                        orange: {
                          border: 'border-orange-500 dark:border-orange-400',
                          bg: 'bg-orange-50 dark:bg-orange-900/20',
                          hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/30',
                          iconBg: 'bg-orange-100 dark:bg-orange-900/30',
                          iconText: 'text-orange-600 dark:text-orange-400',
                          badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                        },
                        purple: {
                          border: 'border-purple-500 dark:border-purple-400',
                          bg: 'bg-purple-50 dark:bg-purple-900/20',
                          hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30',
                          iconBg: 'bg-purple-100 dark:bg-purple-900/30',
                          iconText: 'text-purple-600 dark:text-purple-400',
                          badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        },
                        green: {
                          border: 'border-green-500 dark:border-green-400',
                          bg: 'bg-green-50 dark:bg-green-900/20',
                          hover: 'hover:bg-green-100 dark:hover:bg-green-900/30',
                          iconBg: 'bg-green-100 dark:bg-green-900/30',
                          iconText: 'text-green-600 dark:text-green-400',
                          badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        },
                        blue: {
                          border: 'border-blue-500 dark:border-blue-400',
                          bg: 'bg-blue-50 dark:bg-blue-900/20',
                          hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
                          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
                          iconText: 'text-blue-600 dark:text-blue-400',
                          badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        },
                        yellow: {
                          border: 'border-yellow-500 dark:border-yellow-400',
                          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                          hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
                          iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
                          iconText: 'text-yellow-600 dark:text-yellow-400',
                          badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                        }
                      };
                      const colors = colorClasses[template.color as keyof typeof colorClasses];
                      return (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className={`p-4 border ${colors.border} ${colors.bg} rounded-lg ${colors.hover} hover:shadow-lg transition-all text-left group`}
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
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      All Other Templates
                    </span>
                    <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                  </div>
                </div>
              )}

              {/* Other Templates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {otherTemplates.map((template) => {
                  const Icon = template.icon;
                  const colorClasses = {
                    red: {
                      hover: 'hover:border-red-500 dark:hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/10',
                      iconBg: 'bg-red-100 dark:bg-red-900/30',
                      iconText: 'text-red-600 dark:text-red-400',
                      badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    },
                    orange: {
                      hover: 'hover:border-orange-500 dark:hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10',
                      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
                      iconText: 'text-orange-600 dark:text-orange-400',
                      badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    },
                    purple: {
                      hover: 'hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10',
                      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
                      iconText: 'text-purple-600 dark:text-purple-400',
                      badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    },
                    green: {
                      hover: 'hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10',
                      iconBg: 'bg-green-100 dark:bg-green-900/30',
                      iconText: 'text-green-600 dark:text-green-400',
                      badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    },
                    blue: {
                      hover: 'hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10',
                      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
                      iconText: 'text-blue-600 dark:text-blue-400',
                      badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    },
                    yellow: {
                      hover: 'hover:border-yellow-500 dark:hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/10',
                      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
                      iconText: 'text-yellow-600 dark:text-yellow-400',
                      badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    }
                  };
                  const colors = colorClasses[template.color as keyof typeof colorClasses];
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg ${colors.hover} transition-all text-left group`}
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
                          <div className="mt-2">
                            <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${colors.badge}`}>
                              {CATEGORY_LABELS[template.category] || template.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Assign to Order Section - Only show if not already assigned */}
              {!isAssignedToOrder && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  {!showOrderSearch ? (
                    /* Collapsed Button State */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {orderId
                            ? 'Click to populate this template with order data'
                            : 'This template contains variables. Assign to an order to populate with real data.'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (orderId) {
                            handleAssignToOrder();
                          } else {
                            handleShowOrderSearch();
                          }
                        }}
                        disabled={isLoading}
                        className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                      >
                        {isLoading ? 'Loading...' : orderId ? 'Populate Template' : 'Assign to Order'}
                      </button>
                    </div>
                  ) : (
                    /* Expanded Search State */
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Select an Order
                        </label>
                        <button
                          onClick={() => setShowOrderSearch(false)}
                          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>

                      {isLoadingOrders ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                      ) : allOrders.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                          <Package className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">No orders found</p>
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
                              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-800 dark:text-white text-sm transition-all"
                            />
                          </div>

                          {orders.length === 0 ? (
                            <div className="text-center py-12 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                              <Package className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                              <p className="text-sm text-gray-500 dark:text-gray-400">No matching orders found</p>
                            </div>
                          ) : (
                            <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-72 overflow-y-auto bg-white dark:bg-gray-800 shadow-sm">
                              {orders.map((order) => (
                                <button
                                  key={order.id}
                                  onClick={() => handleOrderSelection(order.id)}
                                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all border-b border-gray-200 dark:border-gray-700 last:border-b-0 text-left group"
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
                  )}
                </div>
              )}

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
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
            <button
              onClick={() => {
                setSelectedTemplate(null);
                setIsAssignedToOrder(false);
                setCopied(false);
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              ← Back to Templates
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-lg transition-colors flex items-center gap-2"
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
          </div>
        )}
      </div>
    </div>
  );
}
