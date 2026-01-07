/*
  # Create function to expire user suggestions efficiently

  1. New Function
    - `expire_user_pending_suggestions(p_user_id uuid)`: Expires all pending and viewed suggestions for a user
    - Returns count of expired suggestions
    - Updates status to 'expired' and sets expired_at timestamp
    - Only affects suggestions with status 'pending' or 'viewed'
    - More efficient than individual updates

  2. Purpose
    - Called before regenerating Rex suggestions on data refresh
    - Ensures suggestions always match current data
    - Clears old suggestions to make way for fresh analysis
*/

-- Create function to expire all pending/viewed suggestions for a user
CREATE OR REPLACE FUNCTION expire_user_pending_suggestions(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Update all pending or viewed suggestions to expired
  UPDATE rex_suggestions
  SET
    status = 'expired',
    expired_at = now()
  WHERE
    user_id = p_user_id
    AND status IN ('pending', 'viewed')
    AND (expired_at IS NULL OR expired_at > now());

  -- Get the count of updated rows
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION expire_user_pending_suggestions(uuid) TO authenticated;