export interface QuoteVariant {
  quantity: number;
  costPerItem: number;
  shippingCost: number;
  totalCost: number;
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