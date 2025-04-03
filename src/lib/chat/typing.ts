import { create } from 'zustand';
import { Socket } from 'socket.io-client';

interface TypingState {
  typingUsers: Map<string, NodeJS.Timeout>;
  setTyping: (userId: string, isTyping: boolean) => void;
  clearTyping: (userId: string) => void;
  clearAllTyping: () => void;
}

export const useTypingStore = create<TypingState>((set, get) => ({
  typingUsers: new Map(),

  setTyping: (userId, isTyping) => {
    const { typingUsers } = get();
    const existingTimeout = typingUsers.get(userId);

    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (isTyping) {
      const timeout = setTimeout(() => {
        get().clearTyping(userId);
      }, 3000) as unknown as NodeJS.Timeout;

      set(state => ({
        typingUsers: new Map(state.typingUsers).set(userId, timeout)
      }));
    } else {
      typingUsers.delete(userId);
      set({ typingUsers: new Map(typingUsers) });
    }
  },

  clearTyping: (userId) => {
    const { typingUsers } = get();
    const timeout = typingUsers.get(userId);
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    typingUsers.delete(userId);
    set({ typingUsers: new Map(typingUsers) });
  },

  clearAllTyping: () => {
    const { typingUsers } = get();
    typingUsers.forEach(timeout => clearTimeout(timeout));
    set({ typingUsers: new Map() });
  }
}));

let typingTimeout: NodeJS.Timeout;

export const initTyping = (socket: Socket) => {
  const store = useTypingStore.getState();

  // Listen for typing events
  socket.on('user:typing', ({ userId, isTyping }) => {
    store.setTyping(userId, isTyping);
  });

  // Clean up on unmount
  return () => {
    socket.off('user:typing');
    store.clearAllTyping();
  };
};

export const emitTyping = (socket: Socket, isTyping: boolean) => {
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }

  socket.emit('user:typing', { isTyping });

  if (isTyping) {
    typingTimeout = setTimeout(() => {
      socket.emit('user:typing', { isTyping: false });
    }, 3000);
  }
};