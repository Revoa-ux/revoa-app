declare global {
  interface Window {
    fbq: any;
    ttq: any;
    gtag: any;
  }
}

export interface IntegrationConfig {
  shopify?: {
    storeUrl: string;
    accessToken: string;
  };
  facebook?: {
    accessToken: string;
    pixelId: string;
  };
  tiktok?: {
    accessToken: string;
    pixelCode: string;
  };
  google?: {
    clientId: string;
    trackingId: string;
  };
}

export interface WebhookConfig {
  topic: string;
  address: string;
}

export interface ProductData {
  id: string;
  title: string;
  description?: string;
  price: number;
  inventory_quantity: number;
  image_url?: string;
  url?: string;
  vendor?: string;
  variants?: Array<{
    id: string;
    title: string;
    price: number;
    inventory_quantity: number;
  }>;
}

export interface TrackingEvent {
  eventName: string;
  eventParams: Record<string, any>;
}

export interface ConversionEvent extends TrackingEvent {
  value?: number;
  currency?: string;
  transactionId?: string;
}

export interface IntegrationStatus {
  connected: boolean;
  error?: string;
  lastSync?: string;
}

export interface IntegrationMetrics {
  apiCalls: number;
  errors: number;
  latency: number;
  lastUpdated: string;
}