import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreatePaymentIntentRequest {
  productId: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
}

interface OnboardSupplierRequest {
  supplierId: string;
  returnUrl: string;
  refreshUrl: string;
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

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    switch (path) {
      case 'create-payment-intent':
        return await handleCreatePaymentIntent(req, supabaseClient, user.id);
      case 'onboard-supplier':
        return await handleOnboardSupplier(req, supabaseClient, user.id);
      case 'account-status':
        return await handleAccountStatus(req, supabaseClient, user.id);
      case 'webhook':
        return await handleWebhook(req, supabaseClient);
      default:
        return new Response(
          JSON.stringify({ error: 'Not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleCreatePaymentIntent(
  req: Request,
  supabaseClient: any,
  userId: string
) {
  try {
    const body: CreatePaymentIntentRequest = await req.json();
    const { productId, amount, currency = 'usd', metadata = {} } = body;

    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('*, product_variants(*)')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: supplier, error: supplierError } = await supabaseClient
      .from('suppliers')
      .select('*')
      .single();

    if (supplierError || !supplier) {
      return new Response(
        JSON.stringify({ error: 'No supplier configured' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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

    const platformFee = Math.round(amount * (supplier.commission_rate / 100));
    const supplierAmount = amount - platformFee;

    const paymentIntentData = {
      amount: Math.round(amount * 100),
      currency: currency,
      payment_method_types: ['card'],
      application_fee_amount: platformFee * 100,
      transfer_data: {
        destination: supplier.stripe_account_id,
      },
      metadata: {
        userId,
        productId,
        supplierId: supplier.id,
        ...metadata,
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
      throw new Error(paymentIntent.error?.message || 'Failed to create payment intent');
    }

    const { error: txError } = await supabaseClient
      .from('marketplace_transactions')
      .insert({
        user_id: userId,
        supplier_id: supplier.id,
        product_id: productId,
        stripe_payment_intent_id: paymentIntent.id,
        total_amount: amount,
        supplier_amount: supplierAmount,
        platform_fee: platformFee,
        status: 'pending',
        currency: currency,
        metadata: metadata,
      });

    if (txError) {
      console.error('Failed to record transaction:', txError);
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleOnboardSupplier(
  req: Request,
  supabaseClient: any,
  userId: string
) {
  try {
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('is_admin')
      .eq('user_id', userId)
      .single();

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body: OnboardSupplierRequest = await req.json();
    const { supplierId, returnUrl, refreshUrl } = body;

    const { data: supplier, error: supplierError } = await supabaseClient
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single();

    if (supplierError || !supplier) {
      return new Response(
        JSON.stringify({ error: 'Supplier not found' }),
        {
          status: 404,
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

    let accountId = supplier.stripe_account_id;

    if (!accountId) {
      const accountData = {
        type: 'express',
        country: 'US',
        email: supplier.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'company',
      };

      const accountResponse = await fetch('https://api.stripe.com/v1/accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(accountData as any).toString(),
      });

      const account = await accountResponse.json();

      if (!accountResponse.ok) {
        throw new Error(account.error?.message || 'Failed to create Stripe account');
      }

      accountId = account.id;

      await supabaseClient
        .from('suppliers')
        .update({ stripe_account_id: accountId })
        .eq('id', supplierId);
    }

    const linkData = {
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    };

    const linkResponse = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(linkData as any).toString(),
    });

    const accountLink = await linkResponse.json();

    if (!linkResponse.ok) {
      throw new Error(accountLink.error?.message || 'Failed to create account link');
    }

    return new Response(
      JSON.stringify({ url: accountLink.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleAccountStatus(
  req: Request,
  supabaseClient: any,
  userId: string
) {
  try {
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('is_admin')
      .eq('user_id', userId)
      .single();

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const url = new URL(req.url);
    const supplierId = url.searchParams.get('supplierId');

    if (!supplierId) {
      return new Response(
        JSON.stringify({ error: 'Supplier ID required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: supplier, error: supplierError } = await supabaseClient
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single();

    if (supplierError || !supplier || !supplier.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: 'Supplier not found or not connected' }),
        {
          status: 404,
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

    const accountResponse = await fetch(
      `https://api.stripe.com/v1/accounts/${supplier.stripe_account_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
        },
      }
    );

    const account = await accountResponse.json();

    if (!accountResponse.ok) {
      throw new Error(account.error?.message || 'Failed to fetch account status');
    }

    const onboardingComplete = account.details_submitted && account.charges_enabled;
    const accountStatus = account.charges_enabled ? 'active' : 'pending';

    await supabaseClient
      .from('suppliers')
      .update({
        onboarding_completed: onboardingComplete,
        stripe_account_status: accountStatus,
      })
      .eq('id', supplierId);

    return new Response(
      JSON.stringify({
        onboardingComplete,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleWebhook(req: Request, supabaseClient: any) {
  try {
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Missing signature or webhook secret' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.text();
    const event = JSON.parse(body);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;

        // Update marketplace transactions (old flow)
        await supabaseClient
          .from('marketplace_transactions')
          .update({
            status: 'succeeded',
            stripe_transfer_id: paymentIntent.transfer,
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        // Update payment_intents table (new balance flow)
        const { data: paymentRecord } = await supabaseClient
          .from('payment_intents')
          .select('*')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .maybeSingle();

        if (paymentRecord) {
          // Update payment status
          await supabaseClient
            .from('payment_intents')
            .update({ status: 'succeeded' })
            .eq('id', paymentRecord.id);

          // Credit merchant balance
          const { data: currentAccount } = await supabaseClient
            .from('balance_accounts')
            .select('current_balance')
            .eq('user_id', paymentRecord.user_id)
            .maybeSingle();

          const newBalance = (currentAccount?.current_balance || 0) + paymentRecord.amount;

          await supabaseClient
            .from('balance_accounts')
            .update({
              current_balance: newBalance,
              last_transaction_at: new Date().toISOString(),
            })
            .eq('user_id', paymentRecord.user_id);

          // Record transaction
          await supabaseClient
            .from('balance_transactions')
            .insert({
              user_id: paymentRecord.user_id,
              type: 'payment',
              amount: paymentRecord.amount,
              balance_after: newBalance,
              description: `Balance top-up via Stripe - $${paymentRecord.amount.toFixed(2)}`,
              reference_type: 'payment_intent',
              reference_id: paymentRecord.id,
              metadata: {
                payment_method: 'stripe',
                platform_fee: paymentRecord.platform_fee,
                stripe_payment_intent_id: paymentIntent.id,
              },
            });

          console.log('[Webhook] Balance credited:', {
            user_id: paymentRecord.user_id,
            amount: paymentRecord.amount,
            new_balance: newBalance,
          });
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        await supabaseClient
          .from('marketplace_transactions')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        await supabaseClient
          .from('marketplace_transactions')
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent_id', charge.payment_intent);
        break;
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
