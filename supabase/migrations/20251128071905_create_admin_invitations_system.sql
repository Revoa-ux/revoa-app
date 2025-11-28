/*
  # Admin Invitations System

  1. New Table: admin_invitations
    - `id` (uuid, primary key)
    - `email` (text) - Email address of the invitee
    - `role` (text) - Role to assign (admin or super_admin)
    - `invited_by` (uuid) - User ID of the inviter
    - `invitation_token` (uuid) - Unique token for accepting invitation
    - `status` (text) - Status: pending, accepted, expired, revoked
    - `expires_at` (timestamptz) - Expiration timestamp (7 days from creation)
    - `accepted_at` (timestamptz) - When invitation was accepted
    - `created_at` (timestamptz) - When invitation was created
    - `metadata` (jsonb) - Additional invitation data

  2. Security
    - Enable RLS on admin_invitations table
    - Super admins can create invitations
    - Admins and super admins can view invitations they created
    - Anyone with valid token can accept (no auth required initially)

  3. Indexes
    - Index on email for quick lookups
    - Index on invitation_token for validation
    - Index on status for filtering
    - Index on expires_at for cleanup queries

  4. Functions
    - Auto-cleanup expired invitations
    - Trigger to prevent duplicate active invitations
*/

-- Create admin_invitations table
CREATE TABLE IF NOT EXISTS admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'super_admin')),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create partial unique index for pending invitations
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_invitations_email_pending 
  ON admin_invitations(email) 
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token ON admin_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON admin_invitations(status);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_expires_at ON admin_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_invited_by ON admin_invitations(invited_by);

-- Comments
COMMENT ON TABLE admin_invitations IS 'Stores admin invitation requests and their status';
COMMENT ON COLUMN admin_invitations.email IS 'Email address of the invited admin';
COMMENT ON COLUMN admin_invitations.role IS 'Role to assign: admin or super_admin';
COMMENT ON COLUMN admin_invitations.invited_by IS 'User ID of the super admin who sent the invitation';
COMMENT ON COLUMN admin_invitations.invitation_token IS 'Unique token used to accept the invitation';
COMMENT ON COLUMN admin_invitations.status IS 'Current status: pending, accepted, expired, or revoked';
COMMENT ON COLUMN admin_invitations.expires_at IS 'When the invitation expires (7 days from creation)';

-- RLS Policies

-- Super admins can create invitations
CREATE POLICY "Super admins can create invitations"
ON admin_invitations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND admin_role = 'super_admin'
  )
);

-- Admins and super admins can view invitations they created
CREATE POLICY "Admins can view own invitations"
ON admin_invitations FOR SELECT
TO authenticated
USING (
  invited_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- Super admins can view all invitations
CREATE POLICY "Super admins can view all invitations"
ON admin_invitations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND admin_role = 'super_admin'
  )
);

-- Super admins can update invitations (e.g., revoke)
CREATE POLICY "Super admins can update invitations"
ON admin_invitations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND admin_role = 'super_admin'
  )
);

-- Super admins can delete invitations
CREATE POLICY "Super admins can delete invitations"
ON admin_invitations FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND admin_role = 'super_admin'
  )
);

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE admin_invitations
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$;

-- Function to check for duplicate pending invitations
CREATE OR REPLACE FUNCTION check_duplicate_invitation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Expire old pending invitations for this email
  UPDATE admin_invitations
  SET status = 'expired',
      updated_at = NOW()
  WHERE email = NEW.email
  AND status = 'pending'
  AND id != NEW.id;

  RETURN NEW;
END;
$$;

-- Trigger to check for duplicates before insert
DROP TRIGGER IF EXISTS trigger_check_duplicate_invitation ON admin_invitations;
CREATE TRIGGER trigger_check_duplicate_invitation
  BEFORE INSERT ON admin_invitations
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_invitation();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_invitations_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_update_admin_invitations_updated_at ON admin_invitations;
CREATE TRIGGER trigger_update_admin_invitations_updated_at
  BEFORE UPDATE ON admin_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_invitations_updated_at();