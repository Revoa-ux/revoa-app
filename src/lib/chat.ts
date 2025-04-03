import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Message } from '@/types/chat';
import { toast } from 'sonner';
import { uploadFile, validateFile } from './chat/fileUpload';
import { validateMessage, messageLimiter, uploadLimiter, RATE_LIMITS } from './chat/validation';
import { ValidationError, MessageError, ConnectionError } from './errors';

interface ChatState {
  messages: Message[];
  isConnected: boolean;
  isTyping: boolean;
  error: string | null;
  socket: Socket | null;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Promise<void>;
  sendFileMessage: (file: File) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
}

// Create socket.io client
const socket = io(import.meta.env.VITE_API_URL || 'https://api.revoa.app', {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000
});

// Create chat store with Zustand
export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isConnected: false,
  isTyping: false,
  error: null,
  socket: null,

  connect: () => {
    try {
      socket.connect();
      
      socket.on('connect', () => {
        set({ isConnected: true, error: null });
      });

      socket.on('disconnect', () => {
        set({ isConnected: false });
      });

      socket.on('error', (error: Error) => {
        set({ error: error.message });
        toast.error('Connection error', {
          description: error.message
        });
      });

      socket.on('message:new', (message: Message) => {
        set(state => ({
          messages: [...state.messages, message]
        }));
      });

      socket.on('message:status', ({ messageId, status }: { messageId: string; status: Message['status'] }) => {
        set(state => ({
          messages: state.messages.map(msg =>
            msg.id === messageId ? { ...msg, status } : msg
          )
        }));
      });

      socket.on('typing:start', () => {
        set({ isTyping: true });
      });

      socket.on('typing:stop', () => {
        set({ isTyping: false });
      });

      set({ socket });
    } catch (error) {
      const connectionError = new ConnectionError(
        error instanceof Error ? error.message : 'Failed to connect'
      );
      set({ error: connectionError.message });
      toast.error('Failed to connect to chat server');
    }
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  sendMessage: async (message) => {
    const { socket } = get();
    if (!socket) {
      throw new ConnectionError('Not connected to chat server');
    }

    // Check rate limit
    if (!messageLimiter.check('send_message', RATE_LIMITS.messages)) {
      throw new MessageError(
        'Too many messages. Please wait a moment.',
        'message/rate_limit',
        429
      );
    }

    try {
      // Validate message content
      await validateMessage(message);

      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const newMessage: Message = {
        id: tempId,
        timestamp: new Date(),
        status: 'sending',
        ...message
      };

      // Optimistically add message to state
      set(state => ({
        messages: [...state.messages, newMessage]
      }));

      // Send message to server
      await new Promise<void>((resolve, reject) => {
        socket.emit('message:send', message, (response: { error?: string }) => {
          if (response.error) {
            reject(new MessageError(response.error));
          } else {
            resolve();
          }
        });
      });

      // Update message status on success
      set(state => ({
        messages: state.messages.map(msg =>
          msg.id === tempId ? { ...msg, status: 'sent' } : msg
        )
      }));
    } catch (error) {
      // Handle send failure
      set(state => ({
        messages: state.messages.map(msg =>
          msg.id === `temp-${Date.now()}` ? { ...msg, status: 'error' } : msg
        )
      }));

      if (error instanceof ValidationError || error instanceof MessageError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to send message', {
          description: error instanceof Error ? error.message : 'Please try again'
        });
      }

      throw error;
    }
  },

  sendFileMessage: async (file: File) => {
    const { socket, sendMessage } = get();
    if (!socket) {
      throw new ConnectionError('Not connected to chat server');
    }

    // Check rate limit
    if (!uploadLimiter.check('file_upload', RATE_LIMITS.uploads)) {
      throw new MessageError(
        'Too many uploads. Please wait a moment.',
        'upload/rate_limit',
        429
      );
    }

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      throw new ValidationError(validationError, 'file');
    }

    try {
      // Upload file
      const { url, type, fileName, fileSize } = await uploadFile(file);

      // Send message with file
      await sendMessage({
        content: url,
        type: type === 'document' ? 'file' : type,
        sender: 'team',
        metadata: {
          fileName,
          fileSize,
          fileType: type,
          mimeType: file.type
        }
      });
    } catch (error) {
      toast.error('Failed to upload file', {
        description: error instanceof Error ? error.message : 'Please try again'
      });
      throw error;
    }
  },

  markAsRead: async (messageId: string) => {
    const { socket } = get();
    if (!socket) {
      throw new ConnectionError('Not connected to chat server');
    }

    try {
      await new Promise<void>((resolve, reject) => {
        socket.emit('message:read', { messageId }, (response: { error?: string }) => {
          if (response.error) {
            reject(new MessageError(response.error));
          } else {
            resolve();
          }
        });
      });

      set(state => ({
        messages: state.messages.map(msg =>
          msg.id === messageId ? { ...msg, status: 'read' } : msg
        )
      }));
    } catch (error) {
      toast.error('Failed to mark message as read');
      throw error;
    }
  },

  setTyping: (isTyping: boolean) => {
    const { socket } = get();
    if (socket) {
      socket.emit(isTyping ? 'typing:start' : 'typing:stop');
    }
  }
}));

// Export singleton instance
export const chatStore = useChatStore;