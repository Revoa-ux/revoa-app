export interface ProductAttribute {
  name: string;   // e.g., "Size", "Color", "Material"
  value: string;  // e.g., "Large", "Red", "Cotton"
}

// Legacy support - kept for backward compatibility
export interface FinalVariant {
  sku: string;
  attributes: ProductAttribute[];
  costPerItem: number;
  shippingCosts: {
    [countryCode: string]: number;
    _default: number;
  };
}

// Legacy support - kept for backward compatibility
export interface QuoteVariant {
  packSize: number;
  skuPrefix: string;
  finalVariants: FinalVariant[];
}

// New simplified types
export interface QuantityTier {
  minQty: number;
  shippingCost: number;
}

export interface ShippingRules {
  default: number;
  byCountry: { [countryCode: string]: number };
  byQuantity?: QuantityTier[];
}

export interface VariantType {
  id: string;
  name: string;  // "Color", "Size", "Material"
  values: string[];  // ["Black", "White", "Yellow"]
}

export interface NewQuoteVariant {
  id: string;
  sku: string;
  name: string;  // Display name: "Black - Large" or "100 units"
  attributes: ProductAttribute[];  // [{name: "Color", value: "Black"}, {name: "Size", value: "Large"}]
  costPerItem: number;
  shippingRules: ShippingRules;
  enabled: boolean;  // For combination matrix - is this variant available?
}

export interface QuoteBuilderData {
  mode: 'guided' | 'quick';
  hasVariants: boolean;
  variantTypes: VariantType[];  // [{ name: "Color", values: ["Black", "White"] }]
  variants: NewQuoteVariant[];
  metadata: {
    totalVariants: number;
    createdAt: string;
    lastModified: string;
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
  shopDomain?: string;
  warrantyDays?: number | null;
  coversLostItems?: boolean;
  coversDamagedItems?: boolean;
  coversLateDelivery?: boolean;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  price: string;
  variants: number;
}