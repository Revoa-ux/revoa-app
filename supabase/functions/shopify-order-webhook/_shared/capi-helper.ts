import { createHash } from 'node:crypto';

export interface ConversionEvent {
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

export interface CAPISettings {
  id: string;
  user_id: string;
  platform: string;
  pixel_id: string;
  access_token: string;
  test_event_code: string | null;
  is_active: boolean;
}

export interface OrderData {
  id: string;
  shopify_order_id: string;
  order_number?: string;
  total_price: number | string;
  currency?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_first_name?: string;
  customer_last_name?: string;
  shipping_city?: string;
  shipping_province?: string;
  shipping_zip?: string;
  shipping_country?: string;
  landing_site?: string;
  referring_site?: string;
  ordered_at: string;
  fbclid?: string;
  line_items?: unknown[];
}

export function hashData(data: string): string {
  return createHash('sha256')
    .update(data.toLowerCase().trim())
    .digest('hex');
}

export function normalizeEmail(email: string): string {
  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2) return email;

  let localPart = parts[0];
  const domain = parts[1];

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    localPart = localPart.replace(/\./g, '').split('+')[0];
  }

  return `${localPart}@${domain}`;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function buildConversionEvent(order: OrderData): ConversionEvent {
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
      value: typeof order.total_price === 'string' ? parseFloat(order.total_price) : order.total_price,
      order_id: order.shopify_order_id,
      content_type: 'product',
      num_items: order.line_items?.length || 1,
    },
  };
}

export async function sendToFacebookCAPI(
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

    console.log('[CAPI Helper] Sending events to Facebook:', {
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
      console.error('[CAPI Helper] Facebook error:', result);
      return {
        success: false,
        error: result.error?.message || 'Unknown error'
      };
    }

    console.log('[CAPI Helper] Facebook response:', result);
    return {
      success: true,
      events_received: result.events_received
    };

  } catch (error) {
    console.error('[CAPI Helper] Exception sending to Facebook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendPurchaseEvent(
  supabase: any,
  userId: string,
  order: OrderData,
  storedOrderId: string
): Promise<{ sent: boolean; platform?: string; error?: string }> {
  try {
    const { data: capiSettings, error: settingsError } = await supabase
      .from('platform_capi_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'facebook')
      .eq('is_active', true)
      .maybeSingle();

    if (settingsError) {
      console.error('[CAPI Helper] Error fetching settings:', settingsError);
      return { sent: false, error: 'Failed to fetch CAPI settings' };
    }

    if (!capiSettings) {
      console.log('[CAPI Helper] No active Facebook CAPI settings for user:', userId);
      return { sent: false, error: 'CAPI not configured' };
    }

    const settings = capiSettings as CAPISettings;
    const event = buildConversionEvent(order);

    const result = await sendToFacebookCAPI(
      settings.pixel_id,
      settings.access_token,
      [event],
      settings.test_event_code
    );

    if (!result.success) {
      console.error('[CAPI Helper] Failed to send event:', result.error);
      return { sent: false, platform: 'facebook', error: result.error };
    }

    const { error: eventError } = await supabase
      .from('conversion_events')
      .insert({
        user_id: userId,
        platform: 'facebook',
        event_name: 'Purchase',
        event_time: order.ordered_at,
        order_id: storedOrderId,
        event_data: {
          order_number: order.order_number,
          total_price: order.total_price,
          currency: order.currency,
          pixel_id: settings.pixel_id,
          test_mode: !!settings.test_event_code,
          auto_triggered: true,
        },
        status: 'sent',
        sent_at: new Date().toISOString(),
        response_code: '200',
      });

    if (eventError) {
      console.warn('[CAPI Helper] Failed to log conversion event:', eventError);
    }

    await supabase
      .from('platform_capi_settings')
      .update({ last_verified_at: new Date().toISOString() })
      .eq('id', settings.id);

    console.log('[CAPI Helper] Purchase event sent successfully for order:', order.order_number);
    return { sent: true, platform: 'facebook' };

  } catch (error) {
    console.error('[CAPI Helper] Unexpected error:', error);
    return { sent: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}