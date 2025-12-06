/*
  # Create Automatic Welcome Message System

  1. New Functions
    - send_welcome_message_on_assignment: Automatically sends a welcome message when a user is assigned to an admin
    
  2. Changes
    - Creates or gets the chat between user and admin
    - Sends personalized welcome message from admin
    - Only sends if no messages exist in the chat yet
    
  3. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only triggers on INSERT to user_assignments
*/

-- Function to send welcome message
CREATE OR REPLACE FUNCTION send_welcome_message_on_assignment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_chat_id UUID;
  v_user_name TEXT;
  v_admin_name TEXT;
  v_message_count INTEGER;
BEGIN
  -- Get user name
  SELECT COALESCE(first_name, name, 'there') INTO v_user_name
  FROM user_profiles
  WHERE id = NEW.user_id;
  
  -- Get admin name
  SELECT COALESCE(first_name, name, 'Your Agent') INTO v_admin_name
  FROM user_profiles
  WHERE id = NEW.admin_id;
  
  -- Find or create chat
  SELECT id INTO v_chat_id
  FROM chats
  WHERE user_id = NEW.user_id 
    AND admin_id = NEW.admin_id
  LIMIT 1;
  
  -- If no chat exists, create one
  IF v_chat_id IS NULL THEN
    INSERT INTO chats (user_id, admin_id, created_at, updated_at)
    VALUES (NEW.user_id, NEW.admin_id, NOW(), NOW())
    RETURNING id INTO v_chat_id;
  END IF;
  
  -- Check if any messages exist in this chat
  SELECT COUNT(*) INTO v_message_count
  FROM messages
  WHERE chat_id = v_chat_id
    AND deleted_at IS NULL;
  
  -- Only send welcome message if no messages exist
  IF v_message_count = 0 THEN
    INSERT INTO messages (
      chat_id,
      content,
      type,
      sender,
      timestamp,
      metadata,
      created_at
    ) VALUES (
      v_chat_id,
      'Hi ' || v_user_name || '. I''m ' || v_admin_name || ', nice to meet you! I''ll be your agent to help with all sorts of scenarios. You can create threads to keep scenarios like "returns" or "replacements" organized in separate chats! And check out the templates that will help you know what to say to your customers in these scenarios based on the policies of the factory and logistics company! I''ll be here to fill in the gaps on everything else.' || E'\n\n' || 'Welcome to Revoa, if you have any questions let me know.' || E'\n\n' || 'Cheers!',
      'text',
      'team',
      NOW(),
      jsonb_build_object(
        'automated', true,
        'welcome_message', true,
        'admin_id', NEW.admin_id,
        'user_id', NEW.user_id
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on user_assignments
DROP TRIGGER IF EXISTS trigger_send_welcome_message ON user_assignments;

CREATE TRIGGER trigger_send_welcome_message
  AFTER INSERT ON user_assignments
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_message_on_assignment();

COMMENT ON FUNCTION send_welcome_message_on_assignment IS 'Automatically sends a personalized welcome message when a user is assigned to an admin';
