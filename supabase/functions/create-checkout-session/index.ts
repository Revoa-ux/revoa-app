import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CheckoutRequest {
  amount: number;
  invoiceId?: string;
  description?: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: CheckoutRequest = await req.json();
    const { amount, invoiceId, description, metadata, successUrl, cancelUrl } = body;

    if (!amount || amount < 50) {
      return new Response(
        JSON.stringify({ error: "Amount must be at least $50" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";
    const productName = description || "Balance Top-Up";
    const defaultSuccessUrl = invoiceId
      ? `${origin}/inventory?success=true&invoiceId=${invoiceId}`
      : `${origin}/balance?success=true`;
    const defaultCancelUrl = invoiceId
      ? `${origin}/inventory?canceled=true`
      : `${origin}/balance?canceled=true`;

    const params = new URLSearchParams({
      "payment_method_types[]": "card",
      "mode": "payment",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]": productName,
      "line_items[0][price_data][unit_amount]": (amount * 100).toString(),
      "line_items[0][quantity]": "1",
      "success_url": successUrl || defaultSuccessUrl,
      "cancel_url": cancelUrl || defaultCancelUrl,
    });

    if (invoiceId) {
      params.append("metadata[invoice_id]", invoiceId);
    }

    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(`metadata[${key}]`, String(value));
        }
      });
    }

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error("Stripe API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create checkout session" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const session = await stripeResponse.json();

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});