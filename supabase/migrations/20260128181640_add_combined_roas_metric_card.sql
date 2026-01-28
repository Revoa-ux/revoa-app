/*
  # Add Combined ROAS Metric Card

  1. New Metric Card
    - Adds `combined_roas` card to metric_cards_metadata
    - Category: 'ads'
    - Shows combined ROAS across all ad platforms with breakdown by platform
    - Available in executive and marketing templates
*/

-- Add combined_roas metric card
INSERT INTO metric_cards_metadata (id, category, title, description, icon, default_size, data_sources, calculation_type, available_in_templates, default_visibility, sort_order)
VALUES
  ('combined_roas', 'ads', 'Combined ROAS', 'Return on ad spend across all platforms', 'TrendingUp', 'medium', '["shopify", "facebook", "google", "tiktok", "computed"]', 'computed', '["executive", "marketing"]', true, 42)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  default_size = EXCLUDED.default_size,
  data_sources = EXCLUDED.data_sources,
  calculation_type = EXCLUDED.calculation_type,
  available_in_templates = EXCLUDED.available_in_templates,
  default_visibility = EXCLUDED.default_visibility,
  sort_order = EXCLUDED.sort_order;
