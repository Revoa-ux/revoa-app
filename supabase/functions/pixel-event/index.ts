import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PixelEvent {
  store_id: string;
  session_id: string;
  event_name: string;
  event_time: string;
  event_data: Record<string, any>;
  attribution: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    fbclid?: string;
    gclid?: string;
    ttclid?: string;
    msclkid?: string;
    landing_page?: string;
    referrer?: string;
    captured_at?: string;
  };
  page: {
    url: string;
    title: string;
    referrer: string;
    path: string;
  };
  user_agent: string;
  screen: {
    width: number;
    height: number;
  };
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

    const event: PixelEvent = await req.json();

    console.log('[Pixel Event] Received:', {
      store_id: event.store_id,
      event_name: event.event_name,
      has_utm: !!event.attribution.utm_source,
      has_fbclid: !!event.attribution.fbclid
    });

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', event.store_id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('[Pixel Event] Store not found:', event.store_id);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid store ID' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: trackingError } = await supabase
      .from('pixel_events')
      .insert({
        user_id: event.store_id,
        session_id: event.session_id,
        event_name: event.event_name,
        event_time: event.event_time,
        event_data: event.event_data,
        page_url: event.page.url,
        page_title: event.page.title,
        page_path: event.page.path,
        referrer: event.page.referrer,
        utm_source: event.attribution.utm_source,
        utm_medium: event.attribution.utm_medium,
        utm_campaign: event.attribution.utm_campaign,
        utm_term: event.attribution.utm_term,
        utm_content: event.attribution.utm_content,
        fbclid: event.attribution.fbclid,
        gclid: event.attribution.gclid,
        ttclid: event.attribution.ttclid,
        msclkid: event.attribution.msclkid,
        landing_page: event.attribution.landing_page,
        user_agent: event.user_agent,
        screen_width: event.screen.width,
        screen_height: event.screen.height,
      });

    if (trackingError) {
      console.error('[Pixel Event] Database error:', trackingError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to store event' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (event.event_name === 'Purchase' && event.event_data.order_id) {
      console.log('[Pixel Event] Purchase detected, will trigger CAPI sync');

      const orderData = {
        shopify_order_id: event.event_data.order_id.toString(),
        order_number: event.event_data.order_number,
        total_price: parseFloat(event.event_data.total_price || '0'),
        currency: event.event_data.currency || 'USD',
        landing_site: event.attribution.landing_page,
        referring_site: event.attribution.referrer,
        ordered_at: event.event_time,
        utm_source: event.attribution.utm_source,
        utm_medium: event.attribution.utm_medium,
        utm_campaign: event.attribution.utm_campaign,
        utm_term: event.attribution.utm_term,
        utm_content: event.attribution.utm_content,
        fbclid: event.attribution.fbclid,
        gclid: event.attribution.gclid,
        ttclid: event.attribution.ttclid,
      };

      const { error: orderError } = await supabase
        .from('shopify_orders')
        .upsert(
          {
            user_id: event.store_id,
            ...orderData
          },
          {
            onConflict: 'user_id,shopify_order_id',
            ignoreDuplicates: false,
          }
        );

      if (orderError) {
        console.error('[Pixel Event] Failed to store order:', orderError);
      } else {
        console.log('[Pixel Event] Order stored successfully');
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[Pixel Event] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
