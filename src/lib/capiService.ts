import { supabase } from './supabase';

export interface CAPISettings {
  id?: string;
  user_id: string;
  platform: 'facebook' | 'google' | 'tiktok';
  pixel_id: string;
  access_token: string;
  test_event_code?: string | null;
  is_active: boolean;
  last_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FacebookTestResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface ConversionEventData {
  event_name: 'Purchase' | 'AddToCart' | 'InitiateCheckout' | 'ViewContent' | 'Lead';
  event_time: number;
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
    value?: number;
    currency?: string;
    content_ids?: string[];
    content_type?: string;
    content_name?: string;
    num_items?: number;
    order_id?: string;
  };
  event_source_url?: string;
  action_source: 'website' | 'app' | 'email' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other';
}

class CAPIService {
  async getSettings(userId: string, platform?: string): Promise<CAPISettings[]> {
    let query = supabase
      .from('platform_capi_settings')
      .select('*')
      .eq('user_id', userId);

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[CAPI] Error fetching settings:', error);
      throw error;
    }

    return data || [];
  }

  async getSettingsByPlatform(userId: string, platform: 'facebook' | 'google' | 'tiktok'): Promise<CAPISettings | null> {
    const { data, error } = await supabase
      .from('platform_capi_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .maybeSingle();

    if (error) {
      console.error('[CAPI] Error fetching settings:', error);
      throw error;
    }

    return data;
  }

  async saveSettings(settings: Omit<CAPISettings, 'id' | 'created_at' | 'updated_at'>): Promise<CAPISettings> {
    const existingSettings = await this.getSettingsByPlatform(settings.user_id, settings.platform);

    if (existingSettings) {
      const { data, error } = await supabase
        .from('platform_capi_settings')
        .update({
          pixel_id: settings.pixel_id,
          access_token: settings.access_token,
          test_event_code: settings.test_event_code,
          is_active: settings.is_active,
          last_verified_at: settings.last_verified_at,
        })
        .eq('id', existingSettings.id)
        .select()
        .single();

      if (error) {
        console.error('[CAPI] Error updating settings:', error);
        throw error;
      }

      return data;
    } else {
      const { data, error } = await supabase
        .from('platform_capi_settings')
        .insert(settings)
        .select()
        .single();

      if (error) {
        console.error('[CAPI] Error inserting settings:', error);
        throw error;
      }

      return data;
    }
  }

  async deleteSettings(userId: string, platform: string): Promise<void> {
    const { error } = await supabase
      .from('platform_capi_settings')
      .delete()
      .eq('user_id', userId)
      .eq('platform', platform);

    if (error) {
      console.error('[CAPI] Error deleting settings:', error);
      throw error;
    }
  }

  async testFacebookConnection(pixelId: string, accessToken: string, testEventCode?: string): Promise<FacebookTestResult> {
    try {
      const testEvent = {
        data: [{
          event_name: 'Test',
          event_time: Math.floor(Date.now() / 1000),
          user_data: {
            em: [await this.hashData('test@example.com')],
          },
          action_source: 'website',
        }],
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
      };

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testEvent),
        }
      );

      const result = await response.json();

      if (response.ok && result.events_received) {
        return {
          success: true,
          message: `Connection successful! ${result.events_received} event(s) received.`,
        };
      } else {
        return {
          success: false,
          message: 'Connection failed',
          error: result.error?.message || 'Unknown error occurred',
        };
      }
    } catch (error) {
      console.error('[CAPI] Facebook test error:', error);
      return {
        success: false,
        message: 'Connection test failed',
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async sendFacebookConversion(
    settings: CAPISettings,
    eventData: ConversionEventData
  ): Promise<{ success: boolean; eventsReceived?: number; error?: string }> {
    if (!settings.is_active || settings.platform !== 'facebook') {
      return { success: false, error: 'Facebook CAPI is not active' };
    }

    try {
      const payload = {
        data: [eventData],
        ...(settings.test_event_code ? { test_event_code: settings.test_event_code } : {}),
      };

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${settings.pixel_id}/events?access_token=${settings.access_token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (response.ok && result.events_received) {
        return {
          success: true,
          eventsReceived: result.events_received,
        };
      } else {
        return {
          success: false,
          error: result.error?.message || 'Failed to send event',
        };
      }
    } catch (error) {
      console.error('[CAPI] Error sending Facebook conversion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async prepareUserData(userData: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    externalId?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
    fbc?: string;
    fbp?: string;
  }): Promise<ConversionEventData['user_data']> {
    const result: ConversionEventData['user_data'] = {};

    if (userData.email) {
      result.em = [await this.hashData(userData.email)];
    }
    if (userData.phone) {
      result.ph = [await this.hashData(userData.phone.replace(/\D/g, ''))];
    }
    if (userData.firstName) {
      result.fn = [await this.hashData(userData.firstName)];
    }
    if (userData.lastName) {
      result.ln = [await this.hashData(userData.lastName)];
    }
    if (userData.city) {
      result.ct = [await this.hashData(userData.city)];
    }
    if (userData.state) {
      result.st = [await this.hashData(userData.state)];
    }
    if (userData.zipCode) {
      result.zp = [await this.hashData(userData.zipCode)];
    }
    if (userData.country) {
      result.country = [await this.hashData(userData.country)];
    }
    if (userData.externalId) {
      result.external_id = [await this.hashData(userData.externalId)];
    }
    if (userData.clientIpAddress) {
      result.client_ip_address = userData.clientIpAddress;
    }
    if (userData.clientUserAgent) {
      result.client_user_agent = userData.clientUserAgent;
    }
    if (userData.fbc) {
      result.fbc = userData.fbc;
    }
    if (userData.fbp) {
      result.fbp = userData.fbp;
    }

    return result;
  }

  async updateLastVerified(userId: string, platform: string): Promise<void> {
    const { error } = await supabase
      .from('platform_capi_settings')
      .update({ last_verified_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('platform', platform);

    if (error) {
      console.error('[CAPI] Error updating last_verified_at:', error);
    }
  }

  async toggleActive(userId: string, platform: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('platform_capi_settings')
      .update({ is_active: isActive })
      .eq('user_id', userId)
      .eq('platform', platform);

    if (error) {
      console.error('[CAPI] Error toggling active status:', error);
      throw error;
    }
  }
}

export const capiService = new CAPIService();
