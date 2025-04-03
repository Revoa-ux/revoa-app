import { io, Socket } from 'socket.io-client';
import { Message } from '@/types/chat';
import { toast } from 'sonner';
import { ConnectionError } from '../errors';

// Socket.io client instance
let socket: Socket | null = null;

// Connection options
const socketOptions = {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
  transports: ['websocket']
};

// Initialize socket connection
export const initSocket = (): Socket => {
  if (socket) return socket;

  socket = io(import.meta.env.VITE_API_URL || 'https://api.revoa.app', socketOptions);

  // Connection event handlers
  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    toast.error('Connection error', {
      description: 'Failed to connect to chat server'
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      // Server disconnected us, try to reconnect
      socket?.connect();
    }
  });

  socket.on('error', (error: Error) => {
    console.error('Socket error:', error);
    toast.error('Chat error', {
      description: error.message
    });
  });

  return socket;
};

// Connect to socket server
export const connectSocket = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const socket = initSocket();

      if (socket.connected) {
        resolve();
        return;
      }

      socket.connect();

      socket.once('connect', () => {
        resolve();
      });

      socket.once('connect_error', (error) => {
        reject(new ConnectionError(error.message));
      });
    } catch (error) {
      reject(new ConnectionError());
    }
  });
};

// Disconnect from socket server
export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

// Send message
export const sendMessage = (message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new ConnectionError('Not connected to chat server'));
      return;
    }

    socket.emit('message:send', message, (response: { message?: Message; error?: string }) => {
      if (response.error) {
        reject(new Error(response.error));
      } else if (response.message) {
        resolve(response.message);
      } else {
        reject(new Error('Invalid server response'));
      }
    });
  });
};

// Update message status
export const updateMessageStatus = (messageId: string, status: Message['status']): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new ConnectionError('Not connected to chat server'));
      return;
    }

    socket.emit('message:status', { messageId, status }, (response: { error?: string }) => {
      if (response.error) {
        reject(new Error(response.error));
      } else {
        resolve();
      }
    });
  });
};

// Subscribe to chat events
export const subscribeToChatEvents = (handlers: {
  onMessage?: (message: Message) => void;
  onTyping?: (data: { userId: string; isTyping: boolean }) => void;
  onStatusChange?: (data: { messageId: string; status: Message['status'] }) => void;
  onError?: (error: Error) => void;
}) => {
  if (!socket) return;

  if (handlers.onMessage) {
    socket.on('message:new', handlers.onMessage);
  }

  if (handlers.onTyping) {
    socket.on('user:typing', handlers.onTyping);
  }

  if (handlers.onStatusChange) {
    socket.on('message:status', handlers.onStatusChange);
  }

  if (handlers.onError) {
    socket.on('error', handlers.onError);
  }

  // Return cleanup function
  return () => {
    if (handlers.onMessage) {
      socket?.off('message:new', handlers.onMessage);
    }
    if (handlers.onTyping) {
      socket?.off('user:typing', handlers.onTyping);
    }
    if (handlers.onStatusChange) {
      socket?.off('message:status', handlers.onStatusChange);
    }
    if (handlers.onError) {
      socket?.off('error', handlers.onError);
    }
  };
};

// Send typing indicator
export const sendTypingIndicator = (isTyping: boolean): void => {
  if (!socket?.connected) return;
  socket.emit('user:typing', { isTyping });
};

// Get socket instance
export const getSocket = (): Socket | null => socket;

// Check connection status
export const isConnected = (): boolean => Boolean(socket?.connected);