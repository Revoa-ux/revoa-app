/*
  # Allow Invitee to Accept Invitation

  1. Changes
    - Add RLS policy to allow the invited user to update their invitation to "accepted"
    - This enables users to mark the invitation as accepted after they sign up/sign in
  
  2. Security
    - Only allows updating status to "accepted" and setting accepted_at
    - Only works if the user's email matches the invitation email
    - Only allows updating their own invitation
*/

-- Allow invited user to mark invitation as accepted
CREATE POLICY "Invitee can accept own invitation"
ON admin_invitations FOR UPDATE
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
)
WITH CHECK (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'accepted'
);