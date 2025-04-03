import { supabase } from '../supabase';
import { SHOPIFY_CONFIG } from './config';

export async function createShopInstallation(
  userId: string, 
  storeUrl: string, 
  accessToken: string,
  scopes: string[]
) {
  try {
    console.log('Creating shop installation:', { userId, storeUrl });

    // First check if installation already exists
    const { data: existing } = await supabase
      .from('shopify_installations')
      .select('*')
      .eq('store_url', storeUrl)
      .maybeSingle();

    const installationData = {
      user_id: userId,
      store_url: storeUrl,
      access_token: accessToken,
      scopes,
      status: 'installed',
      installed_at: new Date().toISOString(),
      last_auth_at: new Date().toISOString(),
      metadata: {
        install_count: existing ? ((existing.metadata?.install_count || 0) + 1) : 1,
        last_install: new Date().toISOString(),
        app_id: SHOPIFY_CONFIG.clientId
      }
    };

    // Upsert the installation
    const { data, error } = await supabase
      .from('shopify_installations')
      .upsert(installationData, {
        onConflict: 'store_url',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting shop installation:', error);
      throw error;
    }

    // Create sync log entry
    const { error: logError } = await supabase
      .from('shopify_sync_logs')
      .insert({
        installation_id: data.id,
        event_type: existing ? 'installation_updated' : 'installation_created',
        status: 'success',
        details: {
          scopes,
          installed_at: new Date().toISOString(),
          app_id: SHOPIFY_CONFIG.clientId
        }
      });

    if (logError) {
      console.error('Error creating sync log:', logError);
    }

    // Create app installation record
    const { error: appError } = await supabase
      .from('shopify_app_installations')
      .insert({
        shop_domain: storeUrl,
        app_id: SHOPIFY_CONFIG.clientId,
        access_token: accessToken,
        scopes,
        status: 'active',
        metadata: {
          installed_at: new Date().toISOString()
        }
      });

    if (appError) {
      console.error('Error creating app installation:', appError);
      throw appError;
    }

    console.log('Installation completed successfully');
    return data;

  } catch (error) {
    console.error('Error in createShopInstallation:', error);

    // Log error
    await supabase
      .from('shopify_sync_logs')
      .insert({
        event_type: 'installation_error',
        status: 'error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          app_id: SHOPIFY_CONFIG.clientId
        }
      });

    throw error;
  }
}

export async function fetchInstallationData(installationId: string) {
  const { data, error } = await supabase
    .from('shopify_installations')
    .select(`
      *,
      shopify_app_installations (
        id,
        status,
        installed_at,
        uninstalled_at
      )
    `)
    .eq('id', installationId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching installation:', error);
    throw error;
  }

  return data;
}