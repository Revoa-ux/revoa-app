import { supabase } from './supabase';

/**
 * Shopify Orders Service
 *
 * Client-side service for performing order mutations via Shopify API
 * Calls the shopify-order-mutations edge function
 */

interface MutationResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface ShippingAddress {
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip: string;
  country: string;
  phone?: string;
}

interface BillingAddress {
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip: string;
  country: string;
}

/**
 * Cancel an order
 */
export async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<MutationResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, message: 'Not authenticated', error: 'Authentication required' };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-order-mutations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'cancel',
          orderId,
          data: { reason },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.error || 'Failed to cancel order',
        error: result.error,
      };
    }

    return result;
  } catch (error) {
    console.error('Error cancelling order:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Issue a refund for an order
 */
export async function refundOrder(
  orderId: string,
  amount?: number,
  reason?: string,
  note?: string
): Promise<MutationResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, message: 'Not authenticated', error: 'Authentication required' };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-order-mutations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'refund',
          orderId,
          data: { amount, reason, note },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.error || 'Failed to refund order',
        error: result.error,
      };
    }

    return result;
  } catch (error) {
    console.error('Error refunding order:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update shipping address for an order
 */
export async function updateShippingAddress(
  orderId: string,
  address: ShippingAddress
): Promise<MutationResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, message: 'Not authenticated', error: 'Authentication required' };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-order-mutations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'update_shipping',
          orderId,
          data: { shipping_address: address },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.error || 'Failed to update shipping address',
        error: result.error,
      };
    }

    return result;
  } catch (error) {
    console.error('Error updating shipping address:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update billing address for an order
 */
export async function updateBillingAddress(
  orderId: string,
  address: BillingAddress
): Promise<MutationResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, message: 'Not authenticated', error: 'Authentication required' };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-order-mutations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'update_billing',
          orderId,
          data: { billing_address: address },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.error || 'Failed to update billing address',
        error: result.error,
      };
    }

    return result;
  } catch (error) {
    console.error('Error updating billing address:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update customer email
 */
export async function updateCustomerEmail(
  orderId: string,
  email: string
): Promise<MutationResponse> {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: 'Invalid email format',
        error: 'Invalid email format',
      };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, message: 'Not authenticated', error: 'Authentication required' };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-order-mutations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'update_email',
          orderId,
          data: { email },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.error || 'Failed to update email',
        error: result.error,
      };
    }

    return result;
  } catch (error) {
    console.error('Error updating customer email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get Shopify admin URL for an order
 */
export async function getShopifyOrderUrl(orderId: string): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Fetch order and shop domain
    const { data: order } = await supabase
      .from('shopify_orders')
      .select('shopify_order_id, user_id')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) return null;

    const { data: installation } = await supabase
      .from('shopify_installations')
      .select('shop_domain')
      .eq('user_id', order.user_id)
      .eq('status', 'installed')
      .is('uninstalled_at', null)
      .maybeSingle();

    if (!installation) return null;

    return `https://${installation.shop_domain}/admin/orders/${order.shopify_order_id}`;
  } catch (error) {
    console.error('Error getting Shopify order URL:', error);
    return null;
  }
}
