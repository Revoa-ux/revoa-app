export type AdPlatform = 'facebook' | 'tiktok' | 'google';

export type AdAccountStatus = 'active' | 'inactive' | 'error';

export interface AdAccount {
  id: string;
  user_id: string;
  platform: AdPlatform;
  platform_account_id: string;
  account_name: string;
  access_token: string;
  token_expires_at: string | null;
  refresh_token: string | null;
  status: AdAccountStatus;
  currency?: string;
  timezone?: string;
  last_synced_at: string | null;
  shopify_store_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AdCampaign {
  id: string;
  ad_account_id: string;
  platform_campaign_id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget: number | null;
  lifetime_budget: number | null;
  start_time: string | null;
  end_time: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AdSet {
  id: string;
  campaign_id: string;
  platform_ad_set_id: string;
  name: string;
  status: string;
  daily_budget: number | null;
  lifetime_budget: number | null;
  bid_strategy: string | null;
  optimization_goal: string | null;
  targeting: Record<string, any> | null;
  start_time: string | null;
  end_time: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Ad {
  id: string;
  ad_set_id: string;
  platform_ad_id: string;
  name: string;
  status: string;
  creative_type: string | null;
  creative_data: {
    headline?: string;
    description?: string;
    image_url?: string;
    video_url?: string;
    thumbnail_url?: string;
    call_to_action?: string;
    link_url?: string;
  } | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type AdMetricEntityType = 'campaign' | 'ad_set' | 'ad';

export interface AdMetric {
  id: string;
  ad_account_id: string;
  entity_type: AdMetricEntityType;
  entity_id: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversion_value: number;
  cpc: number;
  cpm: number;
  ctr: number;
  cpa: number;
  roas: number;
  frequency: number | null;
  reach: number | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AggregatedMetrics {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalConversionValue: number;
  averageCTR: number;
  averageCPC: number;
  averageCPM: number;
  averageROAS: number;
  totalReach: number | null;
}

export interface AdCreativePerformance {
  ad: Ad;
  metrics: AdMetric[];
  aggregated: {
    totalImpressions: number;
    totalClicks: number;
    totalSpend: number;
    totalConversions: number;
    averageCTR: number;
    averageROAS: number;
    averageCPC: number;
  };
  campaign: {
    id: string;
    name: string;
  };
  adSet: {
    id: string;
    name: string;
  };
  platform: AdPlatform;
}

export interface FacebookOAuthResponse {
  success: boolean;
  oauthUrl?: string;
  accounts?: number;
  error?: string;
}

export interface SyncResponse {
  success: boolean;
  campaigns?: number;
  adSets?: number;
  ads?: number;
  metrics?: number;
  message?: string;
  error?: string;
}

export interface DisconnectResponse {
  success: boolean;
  error?: string;
}

export interface AdInsight {
  id: string;
  type: 'performance' | 'anomaly' | 'recommendation' | 'alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  metrics?: Record<string, any>;
  recommendations?: string[];
  status: 'new' | 'acknowledged' | 'resolved';
  createdAt: string;
}

interface AdPlatformConfig {
  platform: 'facebook' | 'tiktok';
  name: string;
  icon: React.FC<{ className?: string }>;
  connectUrl: string;
  color: {
    primary: string;
    secondary: string;
  };
}

export interface AdCheckItem {
  id: string;
  title: string;
  description: string;
  condition: string;
  action: string;
  category: 'test' | 'scale';
  metrics?: string[];
}

interface AdRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionItems: string[];
  metrics?: Record<string, any>;
}
