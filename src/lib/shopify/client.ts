import { GraphQLClient } from 'graphql-request';
import { supabase } from '../supabase';

// Get the current user's Shopify installation
export const getShopifyInstallation = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.error('No authenticated user found');
      return null;
    }

    // Use maybeSingle() instead of single() to avoid errors when no rows are found
    const { data, error } = await supabase
      .from('shopify_installations')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'installed')
      .maybeSingle();

    if (error) {
      console.error('Error fetching Shopify installation:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getShopifyInstallation:', error);
    return null;
  }
};

// Initialize GraphQL client for Storefront API
export const storefrontClient = (accessToken: string, shopDomain: string) => new GraphQLClient(
  `https://${shopDomain}/api/2025-01/graphql.json`,
  {
    headers: {
      'X-Shopify-Storefront-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  }
);

// Initialize GraphQL client for Admin API
export const adminClient = (accessToken: string, shopDomain: string) => new GraphQLClient(
  `https://${shopDomain}/admin/api/2025-01/graphql.json`,
  {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  }
);

// Helper function to make authenticated requests to Shopify Admin API
export const fetchFromShopify = async <T>(endpoint: string, options: RequestInit = {}) => {
  const installation = await getShopifyInstallation();
  
  if (!installation || !installation.access_token) {
    throw new Error('No Shopify installation found or missing access token');
  }

  const response = await fetch(`https://${installation.store_url}/admin/api/2025-01${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': installation.access_token,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Shopify API error: ${error}`);
  }

  return response.json() as Promise<T>;
};

// Helper function to handle API responses
export const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }
  return response.json();
};