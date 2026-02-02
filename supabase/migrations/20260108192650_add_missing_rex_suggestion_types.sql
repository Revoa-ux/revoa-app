/*
  # Add Missing Rex Suggestion Types

  1. Changes
    - Adds additional suggestion types to the rex_suggestion_type enum
    - These types support advanced AI analysis features including:
      - Funnel optimization (landing page, checkout, product page)
      - Demographic and geographic targeting
      - Cross-platform analysis
      - Campaign structure optimization
  
  2. New Enum Values
    - optimize_demographics, optimize_placements, optimize_geographic
    - enable_dayparting, target_high_ltv_segment
    - cross_platform types for multi-platform analysis
    - funnel optimization types
    - campaign structure types (switch_to_cbo, switch_to_abo)
*/

DO $$
BEGIN
  -- Add funnel optimization types
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'optimize_funnel' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'optimize_funnel';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'landing_page_optimization' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'landing_page_optimization';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'product_page_optimization' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'product_page_optimization';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'checkout_optimization' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'checkout_optimization';
  END IF;

  -- Add demographic/targeting optimization types
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'optimize_demographics' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'optimize_demographics';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'optimize_placements' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'optimize_placements';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'optimize_geographic' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'optimize_geographic';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'enable_dayparting' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'enable_dayparting';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'target_high_ltv_segment' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'target_high_ltv_segment';
  END IF;

  -- Add cross-platform analysis types
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cross_platform_budget_reallocation' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'cross_platform_budget_reallocation';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cross_platform_time_optimization' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'cross_platform_time_optimization';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cross_platform_trend_alert' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'cross_platform_trend_alert';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cross_platform_efficiency_opportunity' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'cross_platform_efficiency_opportunity';
  END IF;

  -- Add campaign structure optimization types
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'switch_to_cbo' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'switch_to_cbo';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'switch_to_abo' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'switch_to_abo';
  END IF;

  -- Add other analysis types
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'settings_deviation_warning' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'settings_deviation_warning';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bid_strategy_test' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'bid_strategy_test';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'performance_goal_test' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'performance_goal_test';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pixel_strength_warning' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'pixel_strength_warning';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'payment_issue_warning' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'payment_issue_warning';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'learning_phase_optimization' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'learning_phase_optimization';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'optimize_product_mix' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'optimize_product_mix';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'product_margin_optimization' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'product_margin_optimization';
  END IF;

  -- Add deep analysis types
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'refresh_fatigued_placement' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'refresh_fatigued_placement';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'scale_hidden_winner' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'scale_hidden_winner';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'test_similar_demographic' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'test_similar_demographic';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'expand_winning_region' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'expand_winning_region';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pause_entity' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'pause_entity';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'optimize_campaign' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'optimize_campaign';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'demographic_optimization' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'demographic_optimization';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'placement_optimization' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'placement_optimization';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'geographic_optimization' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'geographic_optimization';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'temporal_optimization' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'temporal_optimization';
  END IF;
END $$;