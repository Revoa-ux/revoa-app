import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createHash } from 'node:crypto';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConversionEvent {
  event_name: string;
  event_time: number;
  event_source_url: string;
  action_source: 'website';
  user_data: {
    em?: string[];
    ph?: string[];
    fn?: string[];
    ln?: string[];
    ct?: string[];
    st?: string[];
    zp?: string[];
    country?: string[];
    external_id?: string[];
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data?: {
    currency?: string;
    value?: number;
    content_ids?: string[];
    content_type?: string;
    order_id?: string;
    num_items?: number;
  };
}

interface CAPISettings {
  id: string;
  user_id: string;
  platform: string;
  pixel_id: string;
  access_token: string;
  test_event_code: string | null;
  is_active: boolean;
}

function hashData(data: string): string {
  return createHash('sha256')
    .update(data.toLowerCase().trim())
    .digest('hex');
}

function normalizeEmail(email: string): string {
  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2) return email;

  let localPart = parts[0];
  const domain = parts[1];

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    localPart = localPart.replace(/\./g, '').split('+')[0];
  }

  return `${localPart}@${domain}`;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

async function sendToFacebookCAPI(
  pixelId: string,
  accessToken: string,
  events: ConversionEvent[],
  testEventCode?: string | null
): Promise<{ success: boolean; events_received?: number; error?: string }> {
  try {
    const url = `https://graph.facebook.com/v18.0/${pixelId}/events`;

    const payload: Record<string, unknown> = {
      data: events,
    };

    if (testEventCode) {
      payload.test_event_code = testEventCode;
    }

    console.log('[CAPI] Sending events to Facebook:', {
      pixel_id: pixelId,
      event_count: events.length,
      event_names: events.map(e => e.event_name),
      test_mode: !!testEventCode
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        access_token: accessToken,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[CAPI] Facebook error:', result);
      return {
        success: false,
        error: result.error?.message || 'Unknown error'
      };
    }

    console.log('[CAPI] Facebook response:', result);
    return {
      success: true,
      events_received: result.events_received
    };

  } catch (error) {
    console.error('[CAPI] Exception sending to Facebook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { order_ids } = await req.json();

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing order_ids array' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: capiSettings, error: settingsError } = await supabase
      .from('platform_capi_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'facebook')
      .eq('is_active', true)
      .maybeSingle();

    if (settingsError) {
      console.error('[CAPI] Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch CAPI settings' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!capiSettings) {
      return new Response(
        JSON.stringify({
          error: 'Facebook CAPI not configured or not active',
          help: 'Go to Settings > Conversions API to configure your Facebook Pixel ID and Access Token'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const settings = capiSettings as CAPISettings;

    const { data: orders, error: ordersError } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('user_id', user.id)
      .in('id', order_ids);

    if (ordersError || !orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Orders not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const events: ConversionEvent[] = orders.map(order => {
      const userData: ConversionEvent['user_data'] = {
        client_user_agent: 'Revoa Server-Side CAPI',
      };

      if (order.customer_email) {
        const normalized = normalizeEmail(order.customer_email);
        userData.em = [hashData(normalized)];
      }

      if (order.customer_phone) {
        userData.ph = [hashData(normalizePhone(order.customer_phone))];
      }

      if (order.customer_first_name) {
        userData.fn = [hashData(order.customer_first_name)];
      }

      if (order.customer_last_name) {
        userData.ln = [hashData(order.customer_last_name)];
      }

      if (order.shipping_city) {
        userData.ct = [hashData(order.shipping_city)];
      }

      if (order.shipping_province) {
        userData.st = [hashData(order.shipping_province)];
      }

      if (order.shipping_zip) {
        userData.zp = [hashData(order.shipping_zip)];
      }

      if (order.shipping_country) {
        userData.country = [hashData(order.shipping_country)];
      }

      userData.external_id = [hashData(order.shopify_order_id)];

      if (order.fbclid) {
        const orderTime = new Date(order.ordered_at).getTime();
        userData.fbc = `fb.1.${orderTime}.${order.fbclid}`;
      }

      return {
        event_name: 'Purchase',
        event_time: Math.floor(new Date(order.ordered_at).getTime() / 1000),
        event_source_url: order.landing_site || order.referring_site || 'https://store.com',
        action_source: 'website' as const,
        user_data: userData,
        custom_data: {
          currency: order.currency || 'USD',
          value: parseFloat(order.total_price),
          order_id: order.shopify_order_id,
          content_type: 'product',
          num_items: order.line_items?.length || 1,
        },
      };
    });

    const result = await sendToFacebookCAPI(
      settings.pixel_id,
      settings.access_token,
      events,
      settings.test_event_code
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: eventError } = await supabase
      .from('conversion_events')
      .insert(
        orders.map(order => ({
          user_id: user.id,
          platform: 'facebook',
          event_name: 'Purchase',
          event_time: order.ordered_at,
          order_id: order.id,
          event_data: {
            order_number: order.order_number,
            total_price: order.total_price,
            currency: order.currency,
            pixel_id: settings.pixel_id,
            test_mode: !!settings.test_event_code,
          },
          status: 'sent',
          sent_at: new Date().toISOString(),
          response_code: '200',
        }))
      );

    if (eventError) {
      console.error('[CAPI] Failed to log events:', eventError);
    }

    await supabase
      .from('platform_capi_settings')
      .update({ last_verified_at: new Date().toISOString() })
      .eq('id', settings.id);

    return new Response(
      JSON.stringify({
        success: true,
        events_sent: events.length,
        events_received: result.events_received,
        test_mode: !!settings.test_event_code
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[CAPI] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});