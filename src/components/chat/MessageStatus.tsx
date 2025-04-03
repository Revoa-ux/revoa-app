import React from 'react';
import { Message } from '@/types/chat';
import { ReadReceipt } from './ReadReceipt';
import { useReadReceiptStore } from '@/lib/chat/readReceipts';

interface MessageStatusProps {
  message: Message;
  showTimestamp?: boolean;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({ 
  message,
  showTimestamp = false
}) => {
  const readTimestamp = useReadReceiptStore(
    state => state.getReadTimestamp(message.id)
  );

  return (
    <div className="flex items-center space-x-2">
      <ReadReceipt 
        status={message.status} 
        timestamp={readTimestamp}
        showText={showTimestamp}
      />
    </div>
  );
};