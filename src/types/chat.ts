export interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'link' | 'invoice';
  sender: 'user' | 'team';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'unread';
  statusTimeline?: {
    sent?: Date;
    delivered?: Date;
    read?: Date;
  };
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  title?: string;
  description?: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    mimeType?: string;
    amount?: number;
    dueDate?: string;
    status?: 'pending' | 'paid' | 'overdue';
    reactions?: {
      emoji: string;
      users: string[];
    }[];
    threadId?: string;
    threadCount?: number;
    replyTo?: string;
    encrypted?: boolean;
    nonce?: string;
    signature?: string;
    senderPublicKey?: string;
    isFlowMessage?: boolean;
    flowSessionId?: string;
    flowName?: string;
    flowCompleted?: boolean;
    flowActive?: boolean;
  };
}

export interface MessageStatusProps {
  status?: Message['status'];
  timeline?: Message['statusTimeline'];
}

export const formatTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

export const formatTimeWithSeconds = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(date);
};