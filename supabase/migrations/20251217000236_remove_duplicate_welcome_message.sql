/*
  # Remove Duplicate Welcome Message

  1. Changes
    - Drop the trigger that sends the first welcome message (from user_assignments)
    - This removes the duplicate message that says "I'm Tyler, nice to meet you..."
    - The initialize-chat edge function will continue to send the second welcome message
    
  2. Impact
    - Users will only receive one welcome message instead of two
    - The welcome message is now solely controlled by the initialize-chat edge function
*/

-- Drop the trigger that sends the duplicate welcome message
DROP TRIGGER IF EXISTS trigger_send_welcome_message ON user_assignments;

-- Drop the function as well since it's no longer needed
DROP FUNCTION IF EXISTS send_welcome_message_on_assignment();
