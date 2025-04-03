import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../lib/config';

const supabase = createClient(config.supabase.url, config.supabase.serviceKey || '');

export const exchangeToken = async (req: Request, res: Response) => {
  try {
    const { shop, code, redirectUri } = req.body;

    if (!shop || !code) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: config.shopify.clientId,
        client_secret: config.shopify.clientSecret,
        code,
        redirect_uri: redirectUri
      })
    });

    // Check response status and content type
    const contentType = tokenResponse.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await tokenResponse.text();
      console.error('Invalid response format:', text);
      return res.status(500).json({ error: 'Invalid response from Shopify' });
    }

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      return res.status(tokenResponse.status).json({
        error: error.error_description || error.error || 'Failed to exchange token'
      });
    }

    const tokenData = await tokenResponse.json();
    res.json(tokenData);
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to exchange token'
    });
  }
};

export const handleUninstall = async (req: Request, res: Response) => {
  try {
    const { shop } = req.body;

    if (!shop) {
      return res.status(400).json({ error: 'Missing shop parameter' });
    }

    // Update installation status
    const { error: updateError } = await supabase
      .from('shopify_installations')
      .update({
        status: 'uninstalled',
        metadata: {
          uninstalled_at: new Date().toISOString()
        }
      })
      .eq('store_url', shop);

    if (updateError) {
      throw updateError;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Uninstall error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to handle uninstall'
    });
  }
};