/*
  # Seed Google Ads Automation Rule Templates

  1. New Templates
    - Device Performance Optimizer - Adjusts bids based on device performance
    - Mobile-First Strategy - Optimizes for mobile conversions
    - Low Quality Score Pauser - Pauses keywords with poor quality scores
    - Impression Share Maximizer - Increases bids for top impression share
    - Budget Lost Opportunity Fixer - Increases budgets when losing impression share
    - Ad Schedule Optimizer - Adjusts bids for peak conversion hours
    - Location Performance Optimizer - Adjusts location bids based on performance
    - Audience Bid Optimizer - Optimizes remarketing audience bids
    - Search Position Defender - Maintains top ad positions
    - Poor ROAS Pauser - Protects profits by pausing underperformers

  2. Template Categories
    - profit_protection: Templates that protect profit margins
    - scale_winners: Templates that scale high-performing entities
    - pause_losers: Templates that pause underperforming entities
    - budget_optimization: Templates that optimize budgets
    - audience_optimization: Templates that optimize audiences/targeting
*/

INSERT INTO ad_automation_rule_templates (
  id, name, description, category, entity_type, condition_logic, 
  conditions, actions, recommended_for, difficulty_level, 
  estimated_impact, use_case_description, success_rate, 
  is_active, is_featured, display_order, platform
) VALUES 
(
  gen_random_uuid(),
  'Device Performance Optimizer',
  'Automatically adjusts device bids based on conversion performance. Increases bids for high-converting devices and decreases for underperformers.',
  'audience_optimization',
  'campaign',
  'AND',
  '[{"metric_type": "conversion_rate", "operator": "greater_than", "threshold_value": 3, "time_window_days": 14}]'::jsonb,
  '[{"action_type": "adjust_device_bid", "action_params": {"device_type": "MOBILE", "bid_modifier_percent": 20}}]'::jsonb,
  ARRAY['ecommerce', 'lead_generation'],
  'intermediate',
  '+15% conversion lift',
  'Best for accounts with significant device performance variations. Analyzes conversion data across mobile, desktop, and tablet to automatically optimize bids.',
  0.78,
  true,
  true,
  100,
  'google'
),
(
  gen_random_uuid(),
  'Mobile-First Bid Strategy',
  'Increases mobile bids when mobile conversion rate exceeds desktop, perfect for mobile-optimized campaigns.',
  'scale_winners',
  'campaign',
  'AND',
  '[{"metric_type": "conversion_rate", "operator": "greater_than", "threshold_value": 2.5, "time_window_days": 7}]'::jsonb,
  '[{"action_type": "adjust_device_bid", "action_params": {"device_type": "MOBILE", "bid_modifier_percent": 30}}]'::jsonb,
  ARRAY['ecommerce', 'app_installs'],
  'beginner',
  '+20% mobile conversions',
  'Ideal for businesses with mobile-first customers. Automatically increases mobile bids when performance warrants it.',
  0.82,
  true,
  true,
  101,
  'google'
),
(
  gen_random_uuid(),
  'Low Quality Score Pauser',
  'Pauses keywords with quality scores below 4, reducing wasted spend on poor-performing search terms.',
  'pause_losers',
  'ad_set',
  'AND',
  '[{"metric_type": "quality_score", "operator": "less_than", "threshold_value": 4, "time_window_days": 14}]'::jsonb,
  '[{"action_type": "pause_entity", "notification_channels": ["in_app", "email"]}]'::jsonb,
  ARRAY['search', 'lead_generation'],
  'beginner',
  '-30% wasted spend',
  'Essential for Search campaigns. Low quality scores mean higher CPCs and lower ad positions. This rule automatically pauses underperformers.',
  0.91,
  true,
  true,
  102,
  'google'
),
(
  gen_random_uuid(),
  'Impression Share Maximizer',
  'Increases bids for campaigns losing significant impression share to rank, helping you win more auctions.',
  'scale_winners',
  'campaign',
  'AND',
  '[{"metric_type": "search_lost_impression_share_rank", "operator": "greater_than", "threshold_value": 20, "time_window_days": 7}]'::jsonb,
  '[{"action_type": "adjust_budget", "budget_change_type": "percent", "budget_change_value": 15, "min_budget": 20, "max_budget": 500}]'::jsonb,
  ARRAY['brand', 'lead_generation'],
  'intermediate',
  '+25% impression share',
  'For campaigns losing impressions due to low bids or budget. Automatically increases bids to capture more search volume.',
  0.73,
  true,
  false,
  103,
  'google'
),
(
  gen_random_uuid(),
  'Budget Lost Opportunity Fixer',
  'Increases campaign budgets when losing more than 15% impression share to budget constraints.',
  'budget_optimization',
  'campaign',
  'AND',
  '[{"metric_type": "search_lost_impression_share_budget", "operator": "greater_than", "threshold_value": 15, "time_window_days": 7}]'::jsonb,
  '[{"action_type": "adjust_budget", "budget_change_type": "percent", "budget_change_value": 20, "min_budget": 25, "max_budget": 1000}]'::jsonb,
  ARRAY['ecommerce', 'lead_generation'],
  'beginner',
  '+20% conversions',
  'Profitable campaigns limited by budget are leaving money on the table. This rule automatically scales budgets to capture missed opportunities.',
  0.85,
  true,
  true,
  104,
  'google'
),
(
  gen_random_uuid(),
  'Peak Hours Bid Booster',
  'Increases bids during high-converting hours based on ad schedule performance data.',
  'scale_winners',
  'campaign',
  'AND',
  '[{"metric_type": "conversion_rate", "operator": "greater_than", "threshold_value": 4, "time_window_days": 14}]'::jsonb,
  '[{"action_type": "adjust_ad_schedule_bid", "action_params": {"day_of_week": "MONDAY", "start_hour": 9, "end_hour": 17, "bid_modifier_percent": 25}}]'::jsonb,
  ARRAY['b2b', 'lead_generation'],
  'advanced',
  '+18% conversion rate',
  'Perfect for B2B businesses with clear peak hours. Automatically increases bids during business hours when decision-makers are active.',
  0.71,
  true,
  false,
  105,
  'google'
),
(
  gen_random_uuid(),
  'High-Value Location Optimizer',
  'Increases bids for locations with above-average conversion rates and revenue.',
  'audience_optimization',
  'campaign',
  'AND',
  '[{"metric_type": "roas", "operator": "greater_than", "threshold_value": 4, "time_window_days": 14}]'::jsonb,
  '[{"action_type": "adjust_location_bid", "action_params": {"location_name": "California", "bid_modifier_percent": 20}}]'::jsonb,
  ARRAY['ecommerce', 'local_services'],
  'intermediate',
  '+22% regional ROAS',
  'For businesses with geographic performance variations. Automatically identifies and scales bids in high-performing locations.',
  0.76,
  true,
  false,
  106,
  'google'
),
(
  gen_random_uuid(),
  'Remarketing Audience Scaler',
  'Increases bids for remarketing audiences showing strong conversion performance.',
  'audience_optimization',
  'campaign',
  'AND',
  '[{"metric_type": "conversion_rate", "operator": "greater_than", "threshold_value": 5, "time_window_days": 7}]'::jsonb,
  '[{"action_type": "adjust_audience_bid", "action_params": {"audience_type": "REMARKETING", "bid_modifier_percent": 40}}]'::jsonb,
  ARRAY['ecommerce', 'saas'],
  'intermediate',
  '+35% remarketing conversions',
  'Remarketing audiences often have 3-5x higher conversion rates. This rule ensures you are bidding aggressively on your warmest prospects.',
  0.88,
  true,
  true,
  107,
  'google'
),
(
  gen_random_uuid(),
  'Top Position Defender',
  'Maintains absolute top impression share for brand campaigns by automatically adjusting bids.',
  'scale_winners',
  'campaign',
  'AND',
  '[{"metric_type": "search_abs_top_impression_share", "operator": "less_than", "threshold_value": 80, "time_window_days": 3}]'::jsonb,
  '[{"action_type": "change_bidding_strategy", "action_params": {"strategy_type": "TARGET_IMPRESSION_SHARE", "target_impression_share": 0.9, "target_impression_share_location": "ABSOLUTE_TOP_OF_PAGE"}}]'::jsonb,
  ARRAY['brand', 'competitive'],
  'advanced',
  '90%+ brand visibility',
  'Critical for brand campaigns where position 1 matters. Automatically ensures your ads appear at the absolute top of search results.',
  0.69,
  true,
  false,
  108,
  'google'
),
(
  gen_random_uuid(),
  'Poor ROAS Pauser',
  'Pauses campaigns with ROAS below your target after sufficient spend to ensure statistical significance.',
  'profit_protection',
  'campaign',
  'AND',
  '[{"metric_type": "roas", "operator": "less_than", "threshold_value": 2, "time_window_days": 14}, {"metric_type": "spend", "operator": "greater_than", "threshold_value": 100, "time_window_days": 14}]'::jsonb,
  '[{"action_type": "pause_entity", "notification_channels": ["in_app", "email"]}]'::jsonb,
  ARRAY['ecommerce', 'lead_generation'],
  'beginner',
  '-40% wasted spend',
  'Protects your ad budget by pausing campaigns that are not meeting ROAS targets. Only triggers after sufficient spend for reliable data.',
  0.89,
  true,
  true,
  109,
  'google'
),
(
  gen_random_uuid(),
  'Target CPA Strategy Switcher',
  'Switches high-volume campaigns to Target CPA bidding when conversion data is sufficient.',
  'budget_optimization',
  'campaign',
  'AND',
  '[{"metric_type": "conversions", "operator": "greater_than", "threshold_value": 30, "time_window_days": 30}]'::jsonb,
  '[{"action_type": "change_bidding_strategy", "action_params": {"strategy_type": "TARGET_CPA", "target_cpa_micros": 25000000}}]'::jsonb,
  ARRAY['lead_generation', 'saas'],
  'advanced',
  '-20% cost per conversion',
  'Google recommends 30+ conversions before using Smart Bidding. This rule automatically switches eligible campaigns to Target CPA for better efficiency.',
  0.74,
  true,
  false,
  110,
  'google'
),
(
  gen_random_uuid(),
  'Desktop Excluder for Mobile Apps',
  'Excludes desktop traffic for app install campaigns where desktop conversions are impossible.',
  'profit_protection',
  'campaign',
  'AND',
  '[{"metric_type": "spend", "operator": "greater_than", "threshold_value": 50, "time_window_days": 7}]'::jsonb,
  '[{"action_type": "adjust_device_bid", "action_params": {"device_type": "DESKTOP", "bid_modifier_percent": -100}}]'::jsonb,
  ARRAY['app_installs'],
  'beginner',
  '-100% desktop waste',
  'App install campaigns should never show on desktop. This rule ensures zero budget is wasted on devices that cannot convert.',
  0.95,
  true,
  false,
  111,
  'google'
);
