import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SHOPIFY_API_VERSION = '2026-01';

const RETURNS_QUERY = `
  query GetReturns($first: Int!, $after: String) {
    returns(first: $first, after: $after) {
      edges {
        node {
          id
          name
          status
          createdAt
          order {
            id
            name
          }
          totalQuantity
          refunds {
            edges {
              node {
                id
                createdAt
                totalRefundedSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                refundLineItems(first: 100) {
                  edges {
                    node {
                      quantity
                      lineItem {
                        id
                        title
                        sku
                      }
                      priceSet {
                        shopMoney {
                          amount
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Server configuration error');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('[Returns Sync] Request from user:', user.id);

    const { data: installation, error: installError } = await supabase
      .from('shopify_installations')
      .select('store_url, access_token')
      .eq('user_id', user.id)
      .eq('status', 'installed')
      .maybeSingle();

    if (installError || !installation) {
      return new Response(
        JSON.stringify({ error: 'No Shopify store connected', synced: 0 }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[Returns Sync] Found installation for shop:', installation.store_url);

    let allReturns: any[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage && allReturns.length < 1000) {
      const shopifyUrl = `https://${installation.store_url}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

      const response = await fetch(shopifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': installation.access_token,
        },
        body: JSON.stringify({
          query: RETURNS_QUERY,
          variables: {
            first: 250,
            after: cursor,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      if (result.errors) {
        const errorMessage = result.errors[0].message;
        if (errorMessage.includes('not approved to access')) {
          console.warn('[Returns Sync] Returns access not yet approved');
          return new Response(
            JSON.stringify({
              error: 'Returns access not approved by Shopify',
              synced: 0
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        throw new Error(`GraphQL error: ${errorMessage}`);
      }

      if (!result.data) {
        throw new Error('No data returned from GraphQL query');
      }

      const returns = result.data.returns.edges.map((edge: any) => edge.node);
      allReturns = allReturns.concat(returns);
      hasNextPage = result.data.returns.pageInfo.hasNextPage;
      cursor = result.data.returns.pageInfo.endCursor;
    }

    console.log('[Returns Sync] Fetched', allReturns.length, 'returns from Shopify');

    let syncedCount = 0;

    for (const returnData of allReturns) {
      for (const refundEdge of returnData.refunds.edges) {
        const refund = refundEdge.node;
        const returnAmount = parseFloat(refund.totalRefundedSet.shopMoney.amount);

        const refundLineItems = refund.refundLineItems.edges.map((edge: any) => ({
          quantity: edge.node.quantity,
          title: edge.node.lineItem.title,
          sku: edge.node.lineItem.sku,
          amount: edge.node.priceSet.shopMoney.amount,
        }));

        const { error } = await supabase
          .from('shopify_returns')
          .upsert({
            user_id: user.id,
            shopify_order_id: returnData.order.id,
            shopify_return_id: returnData.id + '-' + refund.id,
            return_amount: returnAmount,
            returned_at: refund.createdAt,
            refund_line_items: refundLineItems,
          }, {
            onConflict: 'shopify_return_id',
          });

        if (!error) {
          syncedCount++;
        } else {
          console.error('[Returns Sync] Error syncing return:', error);
        }
      }
    }

    console.log('[Returns Sync] Successfully synced', syncedCount, 'returns');

    return new Response(
      JSON.stringify({ synced: syncedCount }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Returns Sync] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, synced: 0 }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
