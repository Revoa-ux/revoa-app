import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PaymentRequest {
  amount: number;
  payment_method: 'stripe' | 'wire';
  invoice_ids?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body: PaymentRequest = await req.json();
    const { amount, payment_method, invoice_ids } = body;

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the single supplier (sourcing agent)
    const { data: supplier, error: supplierError } = await supabaseClient
      .from('suppliers')
      .select('*')
      .maybeSingle();

    if (supplierError || !supplier) {
      return new Response(
        JSON.stringify({ error: 'Supplier not configured' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate 3% platform fee
    const platformFee = Math.round(amount * 0.03 * 100) / 100; // 3% rounded to 2 decimals
    const supplierAmount = amount - platformFee;

    console.log('[Balance Payment] Payment:', {
      amount,
      platform_fee: platformFee,
      supplier_amount: supplierAmount,
      method: payment_method,
    });

    if (payment_method === 'stripe') {
      // Handle Stripe payment
      if (!supplier.stripe_account_id) {
        return new Response(
          JSON.stringify({ error: 'Supplier Stripe account not connected' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeSecretKey) {
        return new Response(
          JSON.stringify({ error: 'Stripe not configured' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Create Stripe Payment Intent with platform fee
      const paymentIntentData = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        payment_method_types: ['card'],
        application_fee_amount: Math.round(platformFee * 100), // Platform fee in cents
        transfer_data: {
          destination: supplier.stripe_account_id,
        },
        metadata: {
          user_id: user.id,
          type: 'balance_topup',
          invoice_ids: invoice_ids ? JSON.stringify(invoice_ids) : '',
        },
      };

      const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(paymentIntentData as any).toString(),
      });

      const paymentIntent = await stripeResponse.json();

      if (!stripeResponse.ok) {
        console.error('[Balance Payment] Stripe error:', paymentIntent);
        throw new Error(paymentIntent.error?.message || 'Failed to create payment intent');
      }

      // Create payment intent record in database
      const { data: paymentRecord, error: paymentError } = await supabaseClient
        .from('payment_intents')
        .insert({
          user_id: user.id,
          supplier_id: supplier.id,
          payment_method: 'stripe',
          amount,
          platform_fee: platformFee,
          supplier_amount: supplierAmount,
          status: 'pending',
          stripe_payment_intent_id: paymentIntent.id,
          invoice_ids: invoice_ids || [],
          metadata: {
            type: 'balance_topup',
          },
        })
        .select()
        .single();

      if (paymentError) {
        console.error('[Balance Payment] Database error:', paymentError);
      }

      console.log('[Balance Payment] Stripe payment intent created:', paymentIntent.id);

      return new Response(
        JSON.stringify({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          dbPaymentId: paymentRecord?.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (payment_method === 'wire') {
      // Handle wire transfer
      // User wires FULL amount to supplier
      // Platform fee tracked internally for monthly invoicing to supplier

      const referenceNumber = `WIRE-${Date.now()}-${user.id.slice(0, 8)}`;

      // Create payment intent record (pending admin confirmation)
      // Note: User wires 'amount', platform fee tracked for supplier invoice
      const { data: paymentRecord, error: paymentError } = await supabaseClient
        .from('payment_intents')
        .insert({
          user_id: user.id,
          supplier_id: supplier.id,
          payment_method: 'wire',
          amount, // Full amount user wires to supplier
          platform_fee: platformFee, // Hidden from user, invoiced to supplier monthly
          supplier_amount: supplierAmount, // What supplier keeps after fee
          status: 'pending',
          wire_reference_number: referenceNumber,
          invoice_ids: invoice_ids || [],
          metadata: {
            type: 'balance_topup',
            fee_hidden_from_user: true,
            fee_invoiced_to_supplier: true,
          },
        })
        .select()
        .single();

      if (paymentError) {
        console.error('[Balance Payment] Database error:', paymentError);
        throw new Error('Failed to create payment record');
      }

      console.log('[Balance Payment] Wire transfer initiated:', {
        reference: referenceNumber,
        amount,
        hidden_platform_fee: platformFee,
      });

      return new Response(
        JSON.stringify({
          paymentIntentId: paymentRecord.id,
          referenceNumber,
          bankDetails: {
            accountHolder: 'Hangzhou Jiaming Yichang Technology',
            accountNumber: '****3545',
            routingNumber: '026073150',
            bankName: 'Wise',
            swiftCode: 'CMFGUS33',
          },
          amount, // User sees full amount only, no fee breakdown
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid payment method' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('[Balance Payment] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
