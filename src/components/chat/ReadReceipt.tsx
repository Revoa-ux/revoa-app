import React from 'react';
import { Check, Clock } from 'lucide-react';
import { Message } from '@/types/chat';

interface ReadReceiptProps {
  status: Message['status'];
  timestamp?: Date;
  showText?: boolean;
}

export const ReadReceipt: React.FC<ReadReceiptProps> = ({ 
  status, 
  timestamp,
  showText = false
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'sent':
        return <Check className="w-4 h-4 text-gray-400" />;
      case 'delivered':
        return (
          <div className="flex">
            <Check className="w-4 h-4 text-primary-500" />
            <Check className="w-4 h-4 -ml-2 text-primary-500" />
          </div>
        );
      case 'read':
        return (
          <div className="flex text-primary-500">
            <Check className="w-4 h-4" />
            <Check className="w-4 h-4 -ml-2" />
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return timestamp 
          ? `Read at ${timestamp.toLocaleTimeString()}`
          : 'Read';
      default:
        return '';
    }
  };

  return (
    <div className="flex items-center space-x-1">
      {getStatusIcon()}
      {showText && (
        <span className="text-xs text-gray-500">{getStatusText()}</span>
      )}
    </div>
  );
};