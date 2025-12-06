import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TemplateDefinition {
  template_name: string;
  template_category: string;
  thread_tags: string[];
  subject_line: string;
  body_text: string;
  display_order: number;
}

const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    template_name: "Return Request: Need More Information",
    template_category: "return_request",
    thread_tags: ["return"],
    subject_line: "Re: Return Request for Order #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

Thank you for reaching out about your return request for order #{{order_number}}.

To process your return, we need a bit more information:
• What is the reason for the return?
• Are all items being returned, or just specific ones?

Please note:
• If the customer changed their mind, there may be a restocking fee
• If the reason is our fault (defective, wrong item, etc.), we'll cover return costs
• Returns must be requested within {{product_return_window_days}} days

Once we have this information, we'll provide the next steps.

Best regards,
{{merchant_store_name}}`,
    display_order: 1,
  },
  {
    template_name: "Return Instructions with WEN",
    template_category: "return_request",
    thread_tags: ["return"],
    subject_line: "Return Instructions for Order #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

Your return has been approved. Here's your **Warehouse Entry Number (WEN)**: [ENTER WEN HERE]

**Important Instructions for Your Customer:**

1. **Write the WEN clearly** on the outside of the package near the shipping label
2. **Include a note inside** with:
   • Their full name
   • Order number: {{order_number}}
   • Product name(s)
   • Quantity being returned (number of boxes, not individual units)

3. **Return Address:**
{{product_return_warehouse_address}}

⚠️ **Critical:** Returns without this information or sent to the wrong address may be rejected.

**Timeline:** Please have your customer ship within 7 days. Processing takes 3-5 business days after we receive the items.

Questions? Just reply to this email.

Best regards,
{{merchant_store_name}}`,
    display_order: 2,
  },
  {
    template_name: "Return Denied: Outside Window",
    template_category: "return_request",
    thread_tags: ["return"],
    subject_line: "Re: Return Request for Order #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

Thank you for contacting us about order #{{order_number}}.

Unfortunately, this order was delivered {{days_since_order}} days ago, which is outside our {{product_return_window_days}}-day return window. We're unable to accept returns after this period.

However, if the item is defective or damaged, we may still be able to help. Items are covered for defects for {{product_defect_coverage_days}} days from delivery.

If you believe the item is defective, please send:
• Clear photos showing the issue
• Description of what's not working

We'll review and determine if we can assist.

Best regards,
{{merchant_store_name}}`,
    display_order: 3,
  },
  {
    template_name: "Replacement Request: Defective Item",
    template_category: "replacement",
    thread_tags: ["replacement", "defective"],
    subject_line: "Re: Replacement Request for Order #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

We're sorry to hear about the issue with your order #{{order_number}}.

To process a replacement, please provide:
• **Clear photos** showing the defect
• **Description** of what's not working
• **When** the issue started

This product is manufactured by {{product_factory_name}}. Once we receive the information, we'll coordinate with them to determine the best solution.

**Coverage:** Defects are covered for {{product_defect_coverage_days}} days from delivery.
**Replacement Timeline:** If approved, replacements typically ship within {{product_replacement_ship_time_days}}.

We'll get this resolved for you as quickly as possible.

Best regards,
{{merchant_store_name}}`,
    display_order: 4,
  },
  {
    template_name: "Replacement Approved: Next Steps",
    template_category: "replacement",
    thread_tags: ["replacement", "defective"],
    subject_line: "Replacement Approved for Order #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

Good news! We've approved your replacement for order #{{order_number}}.

**Next Steps:**
• Your replacement will ship within {{product_replacement_ship_time_days}}
• You'll receive a tracking number once it ships
• [CHOOSE ONE: You may dispose of the defective item / Please return the defective item using the instructions below]

**What your customer needs to do:**
[IF RETURN REQUIRED: Include return instructions with WEN]
[IF NO RETURN: Nothing - they can keep or dispose of the defective item]

We appreciate your patience and apologize for the inconvenience.

Best regards,
{{merchant_store_name}}`,
    display_order: 5,
  },
  {
    template_name: "Damaged in Transit: File Carrier Claim",
    template_category: "damaged",
    thread_tags: ["damaged"],
    subject_line: "Re: Damaged Item - Order #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

We're very sorry to hear your order #{{order_number}} arrived damaged.

**Important:** Damage during transit is typically covered by the shipping carrier, but we need to act quickly.

**Please have your customer do this ASAP:**
1. Take clear photos of:
   • The damaged item
   • The outer packaging (all sides)
   • The shipping label

2. Contact the carrier within {{product_damage_claim_deadline_days}} days:
   • Carrier: [CHECK TRACKING - {{last_mile_carrier}}]
   • Tracking: {{last_mile_tracking_number}}

**Why the carrier?** Once items are handed off to {{last_mile_carrier}} (USPS, Australia Post, Canada Post, etc.), they're out of our freight forwarder's control. The last-mile carrier must handle damage claims.

If the carrier denies the claim or it's been too long, please let us know and we'll see what we can do.

Best regards,
{{merchant_store_name}}`,
    display_order: 6,
  },
  {
    template_name: "Order Status: Tracking Information",
    template_category: "order_status",
    thread_tags: ["inquiry"],
    subject_line: "Order Status for #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

Here's the latest on order #{{order_number}}:

**Order Status:** {{fulfillment_status}}
**Tracking Number:** {{tracking_number}}
**Track Your Package:** {{tracking_url}}

**Delivery Estimate:** {{product_typical_delivery_days}} from ship date

**Last-Mile Carrier:** Once your package reaches the destination country, it's handed off to {{last_mile_carrier}} for final delivery. You can track the last-mile delivery with tracking number: {{last_mile_tracking_number}}

If you have questions about delivery timing or location, please contact {{last_mile_carrier}} directly as they handle the final delivery.

Is there anything else we can help with?

Best regards,
{{merchant_store_name}}`,
    display_order: 7,
  },
  {
    template_name: "Order Delayed: Update",
    template_category: "order_status",
    thread_tags: ["inquiry"],
    subject_line: "Update on Delayed Order #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

We wanted to reach out about order #{{order_number}}, which we know is taking longer than expected.

**Current Status:** {{fulfillment_status}}
**Tracking:** {{tracking_number}}

**What's Happening:**
[CUSTOMIZE: Explain reason for delay - customs, carrier delays, etc.]

**Expected Delivery:** [ENTER UPDATED ESTIMATE]

We're working with {{product_logistics_provider}} to resolve this as quickly as possible. {{#if product_covers_late_delivery}}If the delay exceeds [X days], we'll discuss compensation options.{{/if}}

We apologize for the inconvenience and appreciate your patience.

Best regards,
{{merchant_store_name}}`,
    display_order: 8,
  },
  {
    template_name: "Lost Package: Investigation",
    template_category: "delivery_exception",
    thread_tags: ["inquiry"],
    subject_line: "Investigating Lost Package - Order #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

We're very sorry, but it appears order #{{order_number}} may be lost in transit.

**Order Details:**
• Tracking: {{tracking_number}}
• Last Status: [CHECK TRACKING]
• Expected Delivery: [X days ago]

**Next Steps:**
1. We're filing a claim with {{product_logistics_provider}}
2. {{#if product_covers_lost_items}}Since our freight forwarder covers lost items, we'll process a replacement or refund within 3-5 business days{{else}}We'll need to wait for the carrier's investigation (typically 5-10 business days) before we can offer a solution{{/if}}

**Your Options:**
• Wait for investigation results
• [IF COVERED] Process immediate replacement
• [IF COVERED] Process immediate refund

Please let us know how you'd like to proceed. We'll make this right.

Best regards,
{{merchant_store_name}}`,
    display_order: 9,
  },
  {
    template_name: "Quality Issue: Investigation",
    template_category: "quality_complaint",
    thread_tags: ["defective"],
    subject_line: "Re: Quality Concern - Order #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

Thank you for bringing this quality issue to our attention regarding order #{{order_number}}.

To properly assess the situation, we need:
• **Detailed photos** from multiple angles
• **Video** if applicable (especially helpful for functional issues)
• **Description** of what's wrong

**Our Process:**
1. We'll review the photos/video
2. We may need to consult with our factory: {{product_factory_name}}
3. We'll determine if this is:
   • A defect (covered for {{product_defect_coverage_days}} days)
   • Normal product variation
   • Damage during transit

**Possible Resolutions:**
• Replacement (ships in {{product_replacement_ship_time_days}})
• Partial refund
• Full refund with return

We take quality seriously and will make this right.

Best regards,
{{merchant_store_name}}`,
    display_order: 10,
  },
  {
    template_name: "Wrong Item Shipped",
    template_category: "order_error",
    thread_tags: ["replacement"],
    subject_line: "Wrong Item Shipped - Order #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

We sincerely apologize - it looks like the wrong item was sent for order #{{order_number}}.

**What was ordered:** [ITEM NAME]
**What was received:** [ITEM NAME]

**We'll fix this immediately:**
• Correct item will ship within 1-2 business days
• No cost to you or your customer
• You can have your customer keep, donate, or dispose of the wrong item (no need to return)

**Tracking:** We'll send tracking info as soon as it ships.

We're very sorry for the mix-up and any inconvenience caused.

Best regards,
{{merchant_store_name}}`,
    display_order: 11,
  },
  {
    template_name: "Refund Processed Confirmation",
    template_category: "refund_request",
    thread_tags: ["return"],
    subject_line: "Refund Processed for Order #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

Your refund for order #{{order_number}} has been processed.

**Refund Details:**
• Amount: {{order_total}}
{{#if product_restocking_fee_amount}}• Restocking Fee: ${{product_restocking_fee_amount}}
• Net Refund: [CALCULATE TOTAL - FEE]{{else}}• Net Refund: {{order_total}}{{/if}}
• Method: Original payment method
• Processing Time: 5-10 business days to appear in account

**Note:** The exact timing depends on your customer's bank or credit card company.

If they don't see the refund within 10 business days, please have them check with their bank first, then reach back out to us.

Thank you for your understanding!

Best regards,
{{merchant_store_name}}`,
    display_order: 12,
  },
  {
    template_name: "Partial Refund Offer",
    template_category: "refund_request",
    thread_tags: ["defective", "damaged"],
    subject_line: "Resolution Offer for Order #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

We've reviewed the issue with order #{{order_number}} and we'd like to offer a resolution.

**Option 1: Partial Refund**
• Keep the item
• Receive a [X]% refund ($[AMOUNT])
• No return needed

**Option 2: Full Replacement**
• Return current item (we'll provide instructions)
• Receive brand new replacement
• Ships within {{product_replacement_ship_time_days}}

**Option 3: Full Refund**
• Return item (we'll provide instructions)
• Receive full refund
{{#if product_restocking_fee_amount}}• [IF APPLICABLE] ${{product_restocking_fee_amount}} restocking fee may apply{{/if}}

Which option works best for you? Just reply with your choice and we'll proceed immediately.

Best regards,
{{merchant_store_name}}`,
    display_order: 13,
  },
  {
    template_name: "Delivery Confirmation Request",
    template_category: "order_status",
    thread_tags: ["inquiry"],
    subject_line: "Can You Confirm Delivery? - Order #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

Our tracking shows that order #{{order_number}} was delivered {{delivered_date}}, but we wanted to confirm with you.

**Delivery Details:**
• Tracking: {{tracking_number}}
• Status: Delivered
• Date: {{delivered_date}}
• Location: {{shipping_address_full}}

**Can you confirm:**
• Did your customer receive the package?
• Was everything in good condition?
• Any issues we should know about?

If the package wasn't received, please let us know immediately so we can investigate with the carrier.

Best regards,
{{merchant_store_name}}`,
    display_order: 14,
  },
  {
    template_name: "Customs Delay Explanation",
    template_category: "delivery_exception",
    thread_tags: ["inquiry"],
    subject_line: "Customs Delay - Order #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

Order #{{order_number}} is currently held at customs, which is causing the delay.

**What's Happening:**
International packages must clear customs in the destination country. This process typically takes 3-7 business days but can occasionally take longer.

**Tracking:** {{tracking_number}}
**Current Status:** [CHECK TRACKING]

**What To Do:**
{{#if last_mile_tracking_number}}Your customer should monitor tracking with {{last_mile_carrier}} using: {{last_mile_tracking_number}}{{/if}}

In some cases, the carrier may contact your customer directly for additional information or customs duties.

**Typical Timeline:** Most packages clear customs within 5-7 business days. If it's not moving after 10 business days, we'll escalate.

We know waiting is frustrating. Please let us know if you have other questions!

Best regards,
{{merchant_store_name}}`,
    display_order: 15,
  },
  {
    template_name: "Undeliverable Address: Need Correction",
    template_category: "delivery_exception",
    thread_tags: ["inquiry"],
    subject_line: "Address Issue - Order #{{order_number}}",
    body_text: `Hi {{customer_first_name}},

We've been notified that order #{{order_number}} cannot be delivered to the provided address.

**Delivery Address On File:**
{{shipping_address_full}}

**Issue:** [SPECIFY: Incomplete, incorrect, undeliverable, etc.]

**Options:**
1. **Provide corrected address** - We'll update with the carrier
2. **Return to sender** - We'll issue refund minus return shipping costs
3. **Hold at carrier facility** - Customer picks up (if available)

Please respond quickly as carriers only hold packages for limited time.

**Current Status:** {{tracking_number}}

Best regards,
{{merchant_store_name}}`,
    display_order: 16,
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { product_id, user_id } = await req.json();

    if (!product_id || !user_id) {
      throw new Error("product_id and user_id are required");
    }

    // Check if templates already exist for this product
    const { data: existing, error: checkError } = await supabaseClient
      .from("email_response_templates")
      .select("id")
      .eq("product_id", product_id)
      .limit(1);

    if (checkError) throw checkError;

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Templates already exist for this product",
          count: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Generate templates
    const templatesToInsert = TEMPLATE_DEFINITIONS.map((template) => ({
      user_id,
      product_id,
      template_name: template.template_name,
      template_category: template.template_category,
      thread_tags: template.thread_tags,
      subject_line: template.subject_line,
      body_text: template.body_text,
      display_order: template.display_order,
      is_active: true,
      usage_count: 0,
    }));

    const { error: insertError } = await supabaseClient
      .from("email_response_templates")
      .insert(templatesToInsert);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        count: templatesToInsert.length,
        message: `${templatesToInsert.length} email templates generated successfully`,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error generating templates:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
