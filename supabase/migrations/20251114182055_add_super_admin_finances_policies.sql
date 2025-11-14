/*
  # Add Super Admin Access to Finance Data

  ## Overview
  Ensures payment_intents table has proper RLS policies for super admins to view
  all platform fee data in the Business Finances page.

  ## Changes
  1. Add super admin SELECT policy for payment_intents if not exists
  2. Ensures tyler@revoa.app can see all platform revenue data

  ## Security
  - Only users with is_super_admin = true can view all payment intents
  - Regular admins and users can only see their own data
*/

-- Add super admin policy for payment_intents if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_intents' 
    AND policyname = 'Super admins can view all payment intents'
  ) THEN
    CREATE POLICY "Super admins can view all payment intents"
      ON payment_intents FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_id = auth.uid() AND is_super_admin = true
        )
      );
  END IF;
END $$;

-- Comment for documentation
COMMENT ON TABLE payment_intents IS 'Tracks Stripe and wire transfer payments with 3% platform fee. Super admins can view all for business finances tracking.';
