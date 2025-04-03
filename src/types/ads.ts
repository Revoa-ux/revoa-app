export interface AdAccount {
  id: string;
  platform: 'facebook' | 'tiktok';
  accountId: string;
  accountName?: string;
  status: 'active' | 'disconnected' | 'expired';
  metadata?: Record<string, any>;
}

export interface AdCampaign {
  id: string;
  platformCampaignId: string;
  name: string;
  status: string;
  budgetType: 'daily' | 'lifetime';
  budget: number;
  startDate: string;
  endDate?: string;
  objective: string;
  metadata?: Record<string, any>;
}

export interface AdMetrics {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  cpc?: number;
  cpm?: number;
  ctr?: number;
  frequency?: number;
  conversions?: number;
  conversionValue?: number;
  roas?: number;
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

export interface AdPlatformConfig {
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

export interface AdRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionItems: string[];
  metrics?: Record<string, any>;
}