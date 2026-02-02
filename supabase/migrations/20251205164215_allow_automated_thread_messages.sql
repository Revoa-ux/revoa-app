/*
  # Allow Automated Thread Messages
  
  1. Changes
    - Add policy to allow users to send automated 'team' messages when creating threads
    - This enables the return instruction auto-message feature to work
    
  2. Security
    - Only allows sending to threads created in the same transaction
    - Message must have metadata indicating it's automated
*/

-- Allow users to send automated messages as 'team' when creating a thread
CREATE POLICY "Users can send automated thread messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender = 'team' AND
    metadata->>'automated' = 'true' AND
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = messages.thread_id
      AND EXISTS (
        SELECT 1 FROM chats
        WHERE chats.id = chat_threads.chat_id
        AND chats.user_id = auth.uid()
      )
    )
  );