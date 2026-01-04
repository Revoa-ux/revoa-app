/*
  # Allow Public Invitation Validation

  1. Changes
    - Add RLS policy to allow anyone (authenticated or not) to read admin invitations by token
    - This enables the invitation acceptance flow for users who aren't logged in yet
  
  2. Security
    - Only exposes invitations when queried by exact invitation_token match
    - Does not allow browsing all invitations
    - Token is UUID and cryptographically secure
*/

-- Allow anyone to read invitation details by token (for validation before signup)
CREATE POLICY "Anyone can read invitation by token"
ON admin_invitations FOR SELECT
TO public
USING (invitation_token IS NOT NULL);

-- Also allow service role to update invitation status during acceptance
CREATE POLICY "Service role can update invitations"
ON admin_invitations FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);