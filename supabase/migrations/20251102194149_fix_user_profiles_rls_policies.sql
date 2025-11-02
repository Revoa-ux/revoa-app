/*
  # Fix user_profiles RLS Policies

  1. Issue
    - RLS policies were checking `id = auth.uid()` 
    - But the table uses `user_id` column to reference auth.users
    - This caused all queries to be blocked

  2. Fix
    - Update policies to check `user_id = auth.uid()` instead
    - Maintains the optimized (select auth.uid()) pattern

  3. Security
    - Users can only access their own profile
    - No changes to authorization logic
*/

-- Fix user_profiles policies to use user_id column
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));