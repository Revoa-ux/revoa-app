/*
  # Fix Analytics Preferences Initialization

  ## Changes
  - Fix the initialization trigger to properly set visible_cards as a JSONB array
  - Ensure new users get default cards from executive template on creation
*/

-- Drop and recreate the initialization function with correct JSONB handling
CREATE OR REPLACE FUNCTION initialize_user_analytics_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_cards jsonb;
BEGIN
  -- Get default cards for executive template - build proper JSONB array
  SELECT jsonb_agg(id)
  INTO default_cards
  FROM metric_cards_metadata
  WHERE 
    default_visibility = true
    AND available_in_templates @> '["executive"]'::jsonb;

  -- Set visible cards if not already set or if empty
  IF NEW.visible_cards IS NULL OR NEW.visible_cards = '[]'::jsonb THEN
    NEW.visible_cards := COALESCE(default_cards, '[]'::jsonb);
  END IF;

  RETURN NEW;
END;
$$;

-- Also create a function to manually initialize for existing users
CREATE OR REPLACE FUNCTION reset_user_analytics_to_executive(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_cards jsonb;
BEGIN
  -- Get default cards for executive template
  SELECT jsonb_agg(id)
  INTO default_cards
  FROM metric_cards_metadata
  WHERE 
    default_visibility = true
    AND available_in_templates @> '["executive"]'::jsonb;

  -- Update or insert preferences
  INSERT INTO user_analytics_preferences (user_id, active_template, visible_cards, card_positions, is_editing)
  VALUES (p_user_id, 'executive', COALESCE(default_cards, '[]'::jsonb), '{}'::jsonb, false)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    active_template = 'executive',
    visible_cards = COALESCE(default_cards, '[]'::jsonb),
    updated_at = now();
END;
$$;