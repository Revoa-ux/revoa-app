/*
  # Fix Security Issues - Part 3: Function Search Paths

  1. Fix Mutable Search Paths
    - Add security definer and search_path settings to functions
    - Prevents SQL injection attacks through search_path manipulation
    
  2. Functions Updated
    - update_balance_accounts_updated_at
    - update_order_line_items_updated_at
    - update_payment_intents_updated_at
    - create_balance_account_for_user
*/

-- Fix update_balance_accounts_updated_at
CREATE OR REPLACE FUNCTION public.update_balance_accounts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_order_line_items_updated_at
CREATE OR REPLACE FUNCTION public.update_order_line_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_payment_intents_updated_at
CREATE OR REPLACE FUNCTION public.update_payment_intents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix create_balance_account_for_user
CREATE OR REPLACE FUNCTION public.create_balance_account_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.balance_accounts (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;