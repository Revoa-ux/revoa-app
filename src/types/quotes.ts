export interface ProductAttribute {
  name: string;   // e.g., "Size", "Color", "Material"
  value: string;  // e.g., "Large", "Red", "Cotton"
}

export interface FinalVariant {
  sku: string;
  attributes: ProductAttribute[];  // e.g., [{name: "Color", value: "White"}]
  costPerItem: number;
  shippingCosts: {
    [countryCode: string]: number;
    _default: number;
  };
}

export interface QuoteVariant {
  packSize: number;  // How many units in this pack (1, 2, 5, 10, etc.)
  skuPrefix: string;  // Base SKU for this pack size (e.g., "SUN-SINGLE" or "SUN-5PACK")
  finalVariants: FinalVariant[];  // All color/size combinations for this pack
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