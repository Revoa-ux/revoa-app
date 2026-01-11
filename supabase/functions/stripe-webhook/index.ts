import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const parts = signature.split(",");
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const signaturePart = parts.find((p) => p.startsWith("v1="));

  if (!timestampPart || !signaturePart) {
    return false;
  }

  const timestamp = timestampPart.split("=")[1];
  const expectedSignature = signaturePart.split("=")[1];
  const signedPayload = `${timestamp}.${payload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload)
  );

  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedSignature === expectedSignature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "No signature provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload = await req.text();
    const isValid = await verifyStripeSignature(payload, signature, stripeWebhookSecret);

    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const event = JSON.parse(payload);
    console.log(`Processing Stripe event: ${event.type}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const invoiceId = session.metadata?.invoice_id;
      const invoiceType = session.metadata?.invoice_type;
      const amountTotal = session.amount_total / 100;

      console.log(`Checkout completed for invoice: ${invoiceId}, type: ${invoiceType}, amount: ${amountTotal}`);

      if (invoiceId) {
        const { data: invoice, error: invoiceError } = await supabase
          .from("invoices")
          .select("*, user_id, invoice_type")
          .eq("id", invoiceId)
          .maybeSingle();

        if (invoiceError) {
          console.error("Error fetching invoice:", invoiceError);
        } else if (invoice) {
          const { error: updateError } = await supabase
            .from("invoices")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              payment_method: "stripe",
              stripe_session_id: session.id,
            })
            .eq("id", invoiceId);

          if (updateError) {
            console.error("Error updating invoice:", updateError);
          } else {
            console.log(`Invoice ${invoiceId} marked as paid`);
          }

          if (invoice.invoice_type === "purchase_order" || invoiceType === "purchase_order") {
            const { error: itemsError } = await supabase
              .from("purchase_order_items")
              .update({ status: "paid" })
              .eq("invoice_id", invoiceId);

            if (itemsError) {
              console.error("Error updating purchase order items:", itemsError);
            } else {
              console.log(`Purchase order items for ${invoiceId} marked as paid`);
            }
          }

          const { data: balanceAccount } = await supabase
            .from("balance_accounts")
            .select("id, current_balance")
            .eq("user_id", invoice.user_id)
            .maybeSingle();

          const transactionDescription = invoice.invoice_type === "purchase_order"
            ? `Purchase Order Payment - ${invoice.invoice_number || invoiceId.slice(0, 8)}`
            : `Invoice Payment - ${invoice.invoice_number || invoiceId.slice(0, 8)}`;

          const { error: txError } = await supabase
            .from("balance_transactions")
            .insert({
              user_id: invoice.user_id,
              type: "payment",
              amount: amountTotal,
              balance_after: (balanceAccount?.current_balance || 0) + amountTotal,
              description: transactionDescription,
              reference_type: "invoice",
              reference_id: invoiceId,
              metadata: {
                stripe_session_id: session.id,
                invoice_type: invoice.invoice_type,
                payment_method: "stripe",
              },
            });

          if (txError) {
            console.error("Error creating balance transaction:", txError);
          } else {
            console.log(`Balance transaction created for user ${invoice.user_id}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});