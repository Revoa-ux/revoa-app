export interface ProductAttribute {
  name: string;   // e.g., "Size", "Color", "Material"
  value: string;  // e.g., "Large", "Red", "Cotton"
}

export interface QuoteVariant {
  quantity: number;
  sku?: string;
  attributes?: ProductAttribute[];  // Product variants (size, color, etc.)
  costPerItem: number;
  shippingCost: number;
  totalCost: number;
  shippingCosts?: {
    [countryCode: string]: number;
    _default: number;
  };
}

export interface Quote {
  id: string;
  productUrl: string;
  platform: 'aliexpress' | 'amazon' | 'other';
  productName: string;
  requestDate: string;
  status: 'quote_pending' | 'quoted' | 'rejected' | 'expired' | 'accepted' | 'pending_reacceptance' | 'synced_with_shopify';
  variants?: QuoteVariant[];
  expiresIn?: number;
  shopifyConnected?: boolean;
  shopifyProductId?: string;
  shopifyStatus?: 'pending' | 'synced';
}

export interface ShopifyProduct {
  id: string;
  title: string;
  price: string;
  variants: number;
}