// Client-side webhook handling
export const handleWebhook = async (
  topic: string,
  data: any,
  hmac: string
) => {
  try {
    // Send webhook to our server for verification and processing
    const response = await fetch('/api/shopify/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': topic,
        'X-Shopify-Hmac-SHA256': hmac,
        'X-Shopify-Shop-Domain': import.meta.env.VITE_SHOPIFY_STORE_URL
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to process webhook');
    }

    // Handle specific webhook topics
    switch (topic) {
      case 'products/create':
        await handleProductCreate(data);
        break;
      case 'products/update':
        await handleProductUpdate(data);
        break;
      case 'products/delete':
        await handleProductDelete(data);
        break;
      case 'orders/create':
        await handleOrderCreate(data);
        break;
      case 'orders/fulfilled':
        await handleOrderFulfilled(data);
        break;
      case 'orders/paid':
        await handleOrderPaid(data);
        break;
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }
  } catch (error) {
    console.error(`Error handling ${topic} webhook:`, error);
    throw error;
  }
};

// Register webhooks with Shopify
export const registerWebhooks = async (topics: string[]): Promise<void> => {
  const accessToken = import.meta.env.VITE_SHOPIFY_ADMIN_ACCESS_TOKEN;
  const shop = import.meta.env.VITE_SHOPIFY_STORE_URL;

  for (const topic of topics) {
    try {
      const response = await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken
        },
        body: JSON.stringify({
          webhook: {
            topic,
            address: `${window.location.origin}/api/shopify/webhooks`,
            format: 'json'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to register ${topic} webhook`);
      }
    } catch (error) {
      console.error(`Error registering ${topic} webhook:`, error);
      throw error;
    }
  }
};

// Individual webhook handlers
const handleProductCreate = async (data: any) => {
  console.log('Product created:', data);
  // Implement product creation handling
};

const handleProductUpdate = async (data: any) => {
  console.log('Product updated:', data);
  // Implement product update handling
};

const handleProductDelete = async (data: any) => {
  console.log('Product deleted:', data);
  // Implement product deletion handling
};

const handleOrderCreate = async (data: any) => {
  console.log('Order created:', data);
  // Implement order creation handling
};

const handleOrderFulfilled = async (data: any) => {
  console.log('Order fulfilled:', data);
  // Implement order fulfillment handling
};

const handleOrderPaid = async (data: any) => {
  console.log('Order paid:', data);
  // Implement order payment handling
};