/*
  # Create Onboarding Leads Table

  1. New Tables
    - `onboarding_leads`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text) - User's name
      - `email` (text) - User's email
      - `phone_number` (text, nullable) - Phone number for those wanting help
      - `store_type` (text) - single_product, niche, or general
      - `wants_help` (boolean) - Whether they want growth help
      - `shopify_store_domain` (text, nullable) - Connected Shopify store
      - `shopify_connected` (boolean) - Whether Shopify is connected
      - `facebook_ads_connected` (boolean) - Whether Facebook Ads is connected
      - `google_ads_connected` (boolean) - Whether Google Ads is connected
      - `tiktok_ads_connected` (boolean) - Whether TikTok Ads is connected
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `onboarding_leads` table
    - Add policy for authenticated users to manage their own data
    - Add policy for super admins to view all leads
*/

-- Create the onboarding_leads table
CREATE TABLE IF NOT EXISTS onboarding_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone_number text,
  store_type text NOT NULL CHECK (store_type IN ('single_product', 'niche', 'general')),
  wants_help boolean NOT NULL DEFAULT false,
  shopify_store_domain text,
  shopify_connected boolean NOT NULL DEFAULT false,
  facebook_ads_connected boolean NOT NULL DEFAULT false,
  google_ads_connected boolean NOT NULL DEFAULT false,
  tiktok_ads_connected boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_onboarding_leads_user_id ON onboarding_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_leads_wants_help ON onboarding_leads(wants_help);
CREATE INDEX IF NOT EXISTS idx_onboarding_leads_created_at ON onboarding_leads(created_at);

-- Enable RLS
ALTER TABLE onboarding_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view and update their own lead data
CREATE POLICY "Users can manage own onboarding lead"
  ON onboarding_leads
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Super admins can view all leads
CREATE POLICY "Super admins can view all onboarding leads"
  ON onboarding_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );
