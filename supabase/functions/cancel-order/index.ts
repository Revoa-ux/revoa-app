import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CancelOrderRequest {
  shopify_order_id: string;
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

    const body: CancelOrderRequest = await req.json();
    const { shopify_order_id } = body;

    if (!shopify_order_id) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[Cancel Order] Canceling order:', shopify_order_id);

    // Get order line items that are still pending
    const { data: lineItems, error: lineItemsError } = await supabaseClient
      .from('order_line_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('shopify_order_id', shopify_order_id)
      .eq('fulfillment_status', 'pending');

    if (lineItemsError) {
      console.error('[Cancel Order] Error fetching line items:', lineItemsError);
      throw new Error('Failed to fetch order line items');
    }

    if (!lineItems || lineItems.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Order not found or already fulfilled/cancelled' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate total refund amount
    const totalRefund = lineItems.reduce((sum, item) => sum + item.total_cost, 0);

    console.log('[Cancel Order] Refunding:', {
      items: lineItems.length,
      total: totalRefund,
    });

    // Mark line items as cancelled
    const { error: updateError } = await supabaseClient
      .from('order_line_items')
      .update({
        fulfillment_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('shopify_order_id', shopify_order_id)
      .eq('fulfillment_status', 'pending');

    if (updateError) {
      console.error('[Cancel Order] Error updating line items:', updateError);
      throw new Error('Failed to cancel order line items');
    }

    // Credit balance back to merchant
    if (totalRefund > 0) {
      // Get current balance
      const { data: currentAccount } = await supabaseClient
        .from('balance_accounts')
        .select('current_balance')
        .eq('user_id', user.id)
        .maybeSingle();

      const newBalance = (currentAccount?.current_balance || 0) + totalRefund;

      // Update balance
      await supabaseClient
        .from('balance_accounts')
        .update({
          current_balance: newBalance,
          last_transaction_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      // Record transaction
      await supabaseClient
        .from('balance_transactions')
        .insert({
          user_id: user.id,
          type: 'cancellation',
          amount: totalRefund,
          balance_after: newBalance,
          description: `Order ${shopify_order_id} cancelled - ${lineItems.length} items`,
          reference_type: 'order',
          reference_id: shopify_order_id,
          metadata: {
            shopify_order_id,
            line_items_count: lineItems.length,
            products: lineItems.map(item => item.product_name),
          },
        });

      console.log('[Cancel Order] Balance credited:', {
        amount: totalRefund,
        new_balance: newBalance,
      });
    }

    // Send notification to supplier via chat
    // Get supplier chat for this merchant
    const { data: chats } = await supabaseClient
      .from('chats')
      .select('id, participants')
      .contains('participants', [user.id]);

    if (chats && chats.length > 0) {
      const chat = chats[0];

      // Create message notifying supplier
      const { error: messageError } = await supabaseClient
        .from('messages')
        .insert({
          chat_id: chat.id,
          sender_id: user.id,
          content: `🚫 Order Cancelled\n\nOrder ID: ${shopify_order_id}\nItems: ${lineItems.map(i => `${i.product_name} (${i.quantity}x)`).join(', ')}\n\nThis order has been cancelled and will not require fulfillment.`,
          type: 'text',
          metadata: {
            order_id: shopify_order_id,
            is_system_message: true,
            cancellation: true,
          },
        });

      if (messageError) {
        console.error('[Cancel Order] Error sending chat message:', messageError);
      } else {
        console.log('[Cancel Order] Supplier notified via chat');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        refunded_amount: totalRefund,
        items_cancelled: lineItems.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Cancel Order] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
