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
  variantName?: string;  // Display name for the variant (e.g., "Highland Cow", "Angus Bull")
  quantityTiers?: QuantityTier[];  // Quantity-based shipping discounts
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
  discountAmount: number;  // Discount applied to (baseRate × quantity)
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
  status: 'quote_pending' | 'quoted' | 'rejected' | 'expired' | 'accepted' | 'pending_reacceptance' | 'synced_with_shopify' | 'cancelled';
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

export interface ShopifyVariant {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  inventoryQuantity: number;
  position: number;
  selectedOptions?: Array<{ name: string; value: string }>;
}

export interface ShopifyProductOption {
  id: string;
  name: string;
  position: number;
  values: string[];
}

export interface ShopifyProductWithVariants extends ShopifyProduct {
  variants: ShopifyVariant[];
  options?: ShopifyProductOption[];
}

export interface VariantMapping {
  quoteVariantIndex: number;
  quoteVariantSku: string;
  quoteVariantName: string;
  quoteUnitCost: number;
  quotePackSize: number;
  quoteShippingRules: ShippingRules;
  shopifyVariantId: string;
  shopifyVariantTitle: string;
  shopifyVariantSku: string | null;
  shopifyVariantPrice: string;
  willUpdateSku: boolean;
  willUpdatePrice: boolean;
  priceDifference?: number;
  intendedSellingPrice?: number;
  currentSellingPrice: string;
}

export interface VariantMappingState {
  quoteId: string;
  shopifyProductId: string;
  shopifyProductTitle: string;
  mappings: VariantMapping[];
  isValid: boolean;
  warnings: string[];
  changes: {
    skuUpdates: number;
    priceUpdates: number;
  };
}

export type ShopifySyncStatus = 'pending' | 'synced' | 'outdated' | 'failed';