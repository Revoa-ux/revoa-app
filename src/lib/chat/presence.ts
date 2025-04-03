import { Socket } from 'socket.io-client';
import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  status: 'online' | 'away' | 'offline';
  lastSeen?: Date;
}

interface PresenceStore {
  users: Map<string, User>;
  setUserStatus: (userId: string, status: User['status']) => void;
  setUserLastSeen: (userId: string, lastSeen: Date) => void;
  removeUser: (userId: string) => void;
  clearUsers: () => void;
}

export const usePresenceStore = create<PresenceStore>((set) => ({
  users: new Map(),
  
  setUserStatus: (userId, status) => {
    set((state) => {
      const users = new Map(state.users);
      const user = users.get(userId);
      if (user) {
        users.set(userId, { ...user, status });
      }
      return { users };
    });
  },

  setUserLastSeen: (userId, lastSeen) => {
    set((state) => {
      const users = new Map(state.users);
      const user = users.get(userId);
      if (user) {
        users.set(userId, { ...user, lastSeen });
      }
      return { users };
    });
  },

  removeUser: (userId) => {
    set((state) => {
      const users = new Map(state.users);
      users.delete(userId);
      return { users };
    });
  },

  clearUsers: () => {
    set({ users: new Map() });
  }
}));

export const initPresence = (socket: Socket) => {
  const store = usePresenceStore.getState();

  // Listen for presence events
  socket.on('presence:join', (user: User) => {
    store.setUserStatus(user.id, 'online');
  });

  socket.on('presence:leave', (userId: string) => {
    store.setUserStatus(userId, 'offline');
    store.setUserLastSeen(userId, new Date());
  });

  socket.on('presence:away', (userId: string) => {
    store.setUserStatus(userId, 'away');
  });

  // Send presence heartbeat
  const heartbeat = setInterval(() => {
    socket.emit('presence:heartbeat');
  }, 30000);

  // Clean up
  return () => {
    clearInterval(heartbeat);
    socket.off('presence:join');
    socket.off('presence:leave');
    socket.off('presence:away');
    store.clearUsers();
  };
};

export const formatLastSeen = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString();
};