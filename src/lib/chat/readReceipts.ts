import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { Message } from '@/types/chat';

interface ReadReceiptState {
  readTimestamps: Map<string, Date>;
  markAsRead: (messageId: string) => void;
  getReadTimestamp: (messageId: string) => Date | undefined;
  clearReadReceipts: () => void;
}

export const useReadReceiptStore = create<ReadReceiptState>((set, get) => ({
  readTimestamps: new Map(),

  markAsRead: (messageId) => {
    set(state => ({
      readTimestamps: new Map(state.readTimestamps).set(messageId, new Date())
    }));
  },

  getReadTimestamp: (messageId) => {
    return get().readTimestamps.get(messageId);
  },

  clearReadReceipts: () => {
    set({ readTimestamps: new Map() });
  }
}));

export const initReadReceipts = (socket: Socket) => {
  const store = useReadReceiptStore.getState();

  // Listen for read receipt events
  socket.on('message:read', ({ messageId, timestamp }) => { // eslint-disable-next-line @typescript-eslint/no-unused-vars
    store.markAsRead(messageId);
  });

  // Clean up on unmount
  return () => {
    socket.off('message:read');
    store.clearReadReceipts();
  };
};

export const sendReadReceipt = (socket: Socket, messageId: string) => {
  socket.emit('message:read', { messageId, timestamp: new Date() });
};

// Mark messages as read when they become visible
export const handleMessageVisibility = (
  socket: Socket,
  message: Message,
  isVisible: boolean
) => {
  if (isVisible && message.sender === 'user' && message.status !== 'read') {
    sendReadReceipt(socket, message.id);
  }
};

// Get the latest status for a message
export const getMessageStatus = (
  message: Message,
  readTimestamp?: Date
): Message['status'] => {
  if (readTimestamp) return 'read';
  if (message.status === 'delivered') return 'delivered';
  if (message.status === 'sent') return 'sent';
  return 'sending';
};