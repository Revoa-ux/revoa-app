import { create } from 'zustand';
import { Message } from '@/types/chat';
import { toast } from 'sonner';
import { connectSocket, disconnectSocket, sendMessage, updateMessageStatus, subscribeToChatEvents, sendTypingIndicator } from './socket';
import { encryptMessageObject, decryptMessageObject, signMessage, verifyMessage } from './encryption';
import { uploadFile } from './fileUpload';
import { validateMessage } from './validation';
import { MessageError, ConnectionError } from '../errors';

interface ChatState {
  messages: Message[];
  isConnected: boolean;
  isTyping: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (content: string, type?: Message['type']) => Promise<void>;
  sendFileMessage: (file: File) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isConnected: false,
  isTyping: false,
  error: null,

  connect: async () => {
    try {
      await connectSocket();

      // Subscribe to chat events
      subscribeToChatEvents({
        onMessage: async (message) => {
          // Verify and decrypt incoming messages
          if (message.metadata?.encrypted) {
            const verified = await verifyMessage(message);
            if (!verified) {
              console.error('Message verification failed:', message.id);
              return;
            }
            message = await decryptMessageObject(message, new Uint8Array());
          }

          set(state => ({
            messages: [...state.messages, message]
          }));
        },
        onTyping: ({ isTyping }) => {
          set({ isTyping });
        },
        onStatusChange: ({ messageId, status }) => {
          set(state => ({
            messages: state.messages.map(msg =>
              msg.id === messageId ? { ...msg, status } : msg
            )
          }));
        },
        onError: (error) => {
          set({ error: error.message });
          toast.error('Chat error', {
            description: error.message
          });
        }
      });

      set({ isConnected: true, error: null });
    } catch (error) {
      const connectionError = new ConnectionError(
        error instanceof Error ? error.message : 'Failed to connect'
      );
      set({ error: connectionError.message });
      toast.error('Failed to connect to chat server');
      throw connectionError;
    }
  },

  disconnect: () => {
    disconnectSocket();
    set({ isConnected: false });
  },

  sendMessage: async (content: string, type: Message['type'] = 'text') => {
    const { isConnected } = get();
    if (!isConnected) {
      throw new ConnectionError('Not connected to chat server');
    }

    try {
      // Validate message
      await validateMessage({ content, type, sender: 'team' });

      // Create message object
      let message: Omit<Message, 'id' | 'timestamp'> = {
        content,
        type,
        sender: 'team',
        status: 'sending'
      };

      // Sign and encrypt message
      message = await signMessage(message as Message) as Message;
      message = await encryptMessageObject(message as Message, new Uint8Array());

      // Send message
      const sentMessage = await sendMessage(message);

      // Update messages state
      set(state => ({
        messages: [...state.messages, sentMessage]
      }));
    } catch (error) {
      if (error instanceof MessageError) {
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
    const { isConnected, sendMessage } = get();
    if (!isConnected) {
      throw new ConnectionError('Not connected to chat server');
    }

    try {
      // Upload file
      const { url, type, fileName, fileSize } = await uploadFile(file);

      // Send message with file
      await sendMessage(url, type === 'document' ? 'file' : type);
    } catch (error) {
      toast.error('Failed to upload file', {
        description: error instanceof Error ? error.message : 'Please try again'
      });
      throw error;
    }
  },

  markAsRead: async (messageId: string) => {
    try {
      await updateMessageStatus(messageId, 'read');
      
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
    sendTypingIndicator(isTyping);
  },

  clearError: () => {
    set({ error: null });
  }
}));

// Export singleton instance
export const chatStore = useChatStore;