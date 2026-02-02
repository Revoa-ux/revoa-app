/*
  # Add Cross-Platform Performance Metric Cards

  1. New Metric Cards
    - Combined metrics (aggregated across all platforms):
      - total_ad_spend: Total ad spend across all platforms
      - total_roas: Combined ROAS across all platforms
      - total_conversions: Total conversions from all platforms
      - total_cpa: Average cost per acquisition
      - combined_ctr: Combined click-through rate
      - combined_profit: Total profit from ads
    - Meta-specific metrics:
      - meta_ad_spend: Meta/Facebook ad spend
      - meta_roas: Meta ROAS
      - meta_conversions: Meta conversions
      - meta_cpa: Meta cost per acquisition
    - TikTok-specific metrics:
      - tiktok_ad_spend: TikTok ad spend
      - tiktok_roas: TikTok ROAS
      - tiktok_conversions: TikTok conversions
    - Google Ads-specific metrics:
      - google_ad_spend: Google ad spend
      - google_roas: Google ROAS
      - google_conversions: Google conversions

  2. Changes
    - Insert new metric card definitions into metric_cards_metadata
    - All cards include 'cross_platform' in their available_in_templates array
*/

INSERT INTO metric_cards_metadata (
  id, category, title, description, icon, default_size, data_sources, 
  calculation_type, available_in_templates, default_visibility, sort_order
) VALUES
-- Combined Metrics
(
  'total_ad_spend',
  'ads',
  'Total Ad Spend',
  'Combined advertising spend across all connected platforms',
  'DollarSign',
  'small',
  '["facebook_ads", "google_ads", "tiktok_ads"]',
  'sum',
  '["cross_platform", "marketing"]',
  true,
  100
),
(
  'total_roas',
  'ads',
  'Combined ROAS',
  'Return on ad spend aggregated across all platforms',
  'TrendingUp',
  'small',
  '["facebook_ads", "google_ads", "tiktok_ads"]',
  'weighted_average',
  '["cross_platform", "marketing", "executive"]',
  true,
  101
),
(
  'total_conversions',
  'ads',
  'Total Conversions',
  'Total conversion events from all ad platforms',
  'Target',
  'small',
  '["facebook_ads", "google_ads", "tiktok_ads"]',
  'sum',
  '["cross_platform", "marketing"]',
  true,
  102
),
(
  'total_cpa',
  'ads',
  'Average CPA',
  'Average cost per acquisition across all platforms',
  'DollarSign',
  'small',
  '["facebook_ads", "google_ads", "tiktok_ads"]',
  'weighted_average',
  '["cross_platform", "marketing"]',
  true,
  103
),
(
  'combined_ctr',
  'ads',
  'Combined CTR',
  'Click-through rate aggregated across platforms',
  'Percent',
  'small',
  '["facebook_ads", "google_ads", "tiktok_ads"]',
  'weighted_average',
  '["cross_platform"]',
  true,
  104
),
(
  'combined_profit',
  'ads',
  'Ad Profit',
  'Total profit attributed to advertising',
  'TrendingUp',
  'small',
  '["facebook_ads", "google_ads", "tiktok_ads", "shopify"]',
  'calculated',
  '["cross_platform", "financial"]',
  true,
  105
),

-- Meta/Facebook Metrics
(
  'meta_ad_spend',
  'ads',
  'Meta Ad Spend',
  'Total spend on Facebook and Instagram ads',
  'DollarSign',
  'small',
  '["facebook_ads"]',
  'sum',
  '["cross_platform"]',
  true,
  110
),
(
  'meta_roas',
  'ads',
  'Meta ROAS',
  'Return on ad spend for Meta platforms',
  'TrendingUp',
  'small',
  '["facebook_ads"]',
  'ratio',
  '["cross_platform"]',
  true,
  111
),
(
  'meta_conversions',
  'ads',
  'Meta Conversions',
  'Conversion events from Facebook/Instagram ads',
  'Target',
  'small',
  '["facebook_ads"]',
  'sum',
  '["cross_platform"]',
  true,
  112
),
(
  'meta_cpa',
  'ads',
  'Meta CPA',
  'Cost per acquisition for Meta ads',
  'DollarSign',
  'small',
  '["facebook_ads"]',
  'ratio',
  '["cross_platform"]',
  true,
  113
),

-- TikTok Metrics
(
  'tiktok_ad_spend',
  'ads',
  'TikTok Ad Spend',
  'Total spend on TikTok ads',
  'DollarSign',
  'small',
  '["tiktok_ads"]',
  'sum',
  '["cross_platform"]',
  true,
  120
),
(
  'tiktok_roas',
  'ads',
  'TikTok ROAS',
  'Return on ad spend for TikTok',
  'TrendingUp',
  'small',
  '["tiktok_ads"]',
  'ratio',
  '["cross_platform"]',
  true,
  121
),
(
  'tiktok_conversions',
  'ads',
  'TikTok Conversions',
  'Conversion events from TikTok ads',
  'Target',
  'small',
  '["tiktok_ads"]',
  'sum',
  '["cross_platform"]',
  true,
  122
),

-- Google Ads Metrics
(
  'google_ad_spend',
  'ads',
  'Google Ad Spend',
  'Total spend on Google Ads',
  'DollarSign',
  'small',
  '["google_ads"]',
  'sum',
  '["cross_platform"]',
  true,
  130
),
(
  'google_roas',
  'ads',
  'Google ROAS',
  'Return on ad spend for Google Ads',
  'TrendingUp',
  'small',
  '["google_ads"]',
  'ratio',
  '["cross_platform"]',
  true,
  131
),
(
  'google_conversions',
  'ads',
  'Google Conversions',
  'Conversion events from Google Ads',
  'Target',
  'small',
  '["google_ads"]',
  'sum',
  '["cross_platform"]',
  true,
  132
)
ON CONFLICT (id) DO UPDATE SET
  available_in_templates = EXCLUDED.available_in_templates,
  sort_order = EXCLUDED.sort_order;
