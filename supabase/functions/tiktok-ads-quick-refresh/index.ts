import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { checkSubscription, createSubscriptionRequiredResponse } from '../_shared/subscription-check.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    // Check subscription status
    const { isActive, status, pricingUrl } = await checkSubscription(supabase, user.id);
    if (!isActive) {
      return createSubscriptionRequiredResponse(status, pricingUrl, corsHeaders);
    }

    const { userId, adAccountId } = await req.json();

    console.log('[tiktok-quick-refresh] Starting quick refresh for account:', adAccountId);

    // Get TikTok Ads access token
    const { data: connection } = await supabase
      .from('integration_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'tiktok')
      .maybeSingle();

    if (!connection?.access_token) {
      throw new Error('TikTok Ads not connected');
    }

    // TODO: Implement TikTok Ads quick refresh logic
    // 1. Check for new campaigns, ad sets, and ads
    // 2. If new items found, trigger full sync
    // 3. Otherwise, update metrics for existing items

    console.log('[tiktok-quick-refresh] TikTok Ads quick refresh not yet fully implemented');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'TikTok Ads quick refresh placeholder - full implementation pending'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[tiktok-quick-refresh] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
