/**
 * Fetches the shop owner's email from Shopify Admin API
 * Uses multiple fallback strategies to ensure we get an email
 */

interface ShopData {
  shop: {
    email: string | null;
    contactEmail: string | null;
    name: string;
    myshopifyDomain: string;
  };
}

export async function getShopOwnerEmail(
  accessToken: string,
  shopDomain: string
): Promise<string> {
  const graphqlEndpoint = `https://${shopDomain}/admin/api/2026-01/graphql.json`;

  const query = `
    query {
      shop {
        email
        contactEmail
        name
        myshopifyDomain
      }
    }
  `;

  try {
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.error('Shopify API error:', response.status, await response.text());

      // Retry once after 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      const retryResponse = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({ query }),
      });

      if (!retryResponse.ok) {
        throw new Error('Failed to fetch shop data after retry');
      }

      const retryData: { data: ShopData } = await retryResponse.json();
      return extractEmailFromShopData(retryData.data, shopDomain);
    }

    const data: { data: ShopData } = await response.json();
    return extractEmailFromShopData(data.data, shopDomain);

  } catch (error) {
    console.error('Error fetching shop owner email:', error);

    // Fallback: Generate email from shop domain
    const fallbackEmail = generateFallbackEmail(shopDomain);
    console.warn('Using fallback email:', fallbackEmail);

    return fallbackEmail;
  }
}

function extractEmailFromShopData(data: ShopData, shopDomain: string): string {
  const { shop } = data;

  // Priority 1: Use shop.email
  if (shop.email) {
    return shop.email;
  }

  // Priority 2: Use shop.contactEmail
  if (shop.contactEmail) {
    return shop.contactEmail;
  }

  // Priority 3: Generate from shop domain
  const fallbackEmail = generateFallbackEmail(shopDomain);
  console.warn('No email found in shop data, using fallback:', fallbackEmail);

  return fallbackEmail;
}

function generateFallbackEmail(shopDomain: string): string {
  // Extract shop name from domain (remove .myshopify.com)
  const shopName = shopDomain.replace('.myshopify.com', '');

  // Create a fallback email address
  return `${shopName}@shop.revoa.app`;
}
