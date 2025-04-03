// PayPal OAuth configuration
const PAYPAL_CONFIG = {
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
  redirectUri: `${window.location.origin}/paypal/callback`,
  scope: 'openid email https://uri.paypal.com/services/payments/payment',
};

// PayPal OAuth URL generator
export const getPayPalAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: PAYPAL_CONFIG.clientId,
    response_type: 'code',
    scope: PAYPAL_CONFIG.scope,
    redirect_uri: PAYPAL_CONFIG.redirectUri,
  });

  return `https://www.paypal.com/connect?${params.toString()}`;
};

// Handle PayPal OAuth callback
export const handlePayPalCallback = async (code: string) => {
  try {
    const response = await fetch('/api/paypal/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error('Failed to authenticate with PayPal');
    }

    return await response.json();
  } catch (error) {
    console.error('PayPal authentication error:', error);
    throw error;
  }
};

// Verify PayPal account
export const verifyPayPalAccount = async (token: string) => {
  try {
    const response = await fetch('/api/paypal/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to verify PayPal account');
    }

    return await response.json();
  } catch (error) {
    console.error('PayPal verification error:', error);
    throw error;
  }
};

// Get PayPal account status
export const getPayPalAccountStatus = async (token: string) => {
  try {
    const response = await fetch('/api/paypal/status', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get PayPal account status');
    }

    return await response.json();
  } catch (error) {
    console.error('PayPal status error:', error);
    throw error;
  }
};

// Disconnect PayPal account
export const disconnectPayPalAccount = async (token: string) => {
  try {
    const response = await fetch('/api/paypal/disconnect', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to disconnect PayPal account');
    }

    return true;
  } catch (error) {
    console.error('PayPal disconnection error:', error);
    throw error;
  }
};