import { fetchFromShopify } from './client';
import { Quote } from '@/types/quotes';

interface ShopifyProduct {
  id: string;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  status: string;
  variants: Array<{
    price: string;
    sku: string;
    inventory_quantity: number;
    inventory_management: string;
  }>;
}

export const createProduct = async (quote: Quote): Promise<ShopifyProduct> => {
  try {
    const product = {
      title: quote.productName,
      body_html: quote.description || '',
      vendor: 'Revoa',
      product_type: 'Quote Product',
      variants: quote.variants?.map(variant => ({
        price: variant.totalCost.toString(),
        sku: `QT-${quote.id}-${variant.quantity}`,
        inventory_management: 'shopify',
        inventory_quantity: variant.quantity,
        requires_shipping: true
      })),
      status: 'draft'
    };

    const response = await fetchFromShopify('/products.json', {
      method: 'POST',
      body: JSON.stringify({ product })
    });

    return response.product;
  } catch (error) {
    console.error('Error creating Shopify product:', error);
    throw error;
  }
};

export const updateProduct = async (productId: string, quote: Quote): Promise<ShopifyProduct> => {
  try {
    const product = {
      variants: quote.variants?.map(variant => ({
        price: variant.totalCost.toString(),
        inventory_quantity: variant.quantity
      }))
    };

    const response = await fetchFromShopify(`/products/${productId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ product })
    });

    return response.product;
  } catch (error) {
    console.error('Error updating Shopify product:', error);
    throw error;
  }
};

export const getProducts = async (query = ''): Promise<ShopifyProduct[]> => {
  try {
    const params = new URLSearchParams();
    if (query) {
      params.append('title', query);
    }
    
    const response = await fetchFromShopify(`/products.json?${params.toString()}`);
    return response.products;
  } catch (error) {
    console.error('Error fetching Shopify products:', error);
    throw error;
  }
};

export const getProduct = async (productId: string): Promise<ShopifyProduct> => {
  try {
    const response = await fetchFromShopify(`/products/${productId}.json`);
    return response.product;
  } catch (error) {
    console.error('Error fetching Shopify product:', error);
    throw error;
  }
};

export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    await fetchFromShopify(`/products/${productId}.json`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting Shopify product:', error);
    throw error;
  }
};

export const updateInventoryLevel = async (
  inventoryItemId: string,
  locationId: string,
  adjustment: number
): Promise<void> => {
  try {
    await fetchFromShopify('/inventory_levels/adjust.json', {
      method: 'POST',
      body: JSON.stringify({
        inventory_item_id: inventoryItemId,
        location_id: locationId,
        available_adjustment: adjustment
      })
    });
  } catch (error) {
    console.error('Error updating inventory level:', error);
    throw error;
  }
};