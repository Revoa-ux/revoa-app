export interface ShopifyStore {
  id: string;
  name: string;
  domain: string;
  accessToken: string;
  scopes: string[];
  webhooks: WebhookSubscription[];
  createdAt: string;
  updatedAt: string;
}

export interface WebhookSubscription {
  id: string;
  topic: string;
  address: string;
  format: 'json';
  createdAt: string;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  status: 'active' | 'archived' | 'draft';
  variants: ProductVariant[];
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: string;
  sku: string;
  position: number;
  inventoryQuantity: number;
  inventoryManagement: 'shopify' | 'not_managed';
  requiresShipping: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  position: number;
  src: string;
  width: number;
  height: number;
  alt?: string;
}

export interface ShopifyOrder {
  id: string;
  name: string;
  number: number;
  note?: string;
  totalPrice: string;
  subtotalPrice: string;
  totalTax: string;
  totalShipping: string;
  financialStatus: 'pending' | 'authorized' | 'paid' | 'partially_paid' | 'refunded' | 'voided';
  fulfillmentStatus: 'fulfilled' | 'partial' | 'not_fulfilled' | 'restocked';
  customer: OrderCustomer;
  lineItems: OrderLineItem[];
  shippingAddress?: Address;
  billingAddress?: Address;
  createdAt: string;
  updatedAt: string;
}

export interface OrderCustomer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  ordersCount: number;
  totalSpent: string;
}

export interface OrderLineItem {
  id: string;
  title: string;
  variantId: string;
  quantity: number;
  price: string;
  sku?: string;
  vendor?: string;
  requiresShipping: boolean;
  taxable: boolean;
  fulfillmentStatus: 'fulfilled' | 'not_fulfilled' | 'partial' | 'restocked';
}

export interface Address {
  firstName?: string;
  lastName?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
  phone?: string;
}