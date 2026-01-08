import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SyncSource = 'settings' | 'analytics' | 'audit' | 'background';

interface SyncState {
  lastSyncedAt: number | null;
  isSyncing: boolean;
  syncSource: SyncSource | null;
  lastSyncError: string | null;

  canAutoSync: () => boolean;
  startSync: (source: SyncSource) => boolean;
  completeSync: (error?: string) => void;
  getTimeSinceLastSync: () => number | null;
  reset: () => void;
}

const AUTO_SYNC_BLOCK_THRESHOLD = 15 * 60 * 1000; // 15 minutes

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      lastSyncedAt: null,
      isSyncing: false,
      syncSource: null,
      lastSyncError: null,

      canAutoSync: () => {
        const state = get();
        if (state.isSyncing) {
          console.log('[SyncStore] Auto-sync blocked: sync already in progress');
          return false;
        }

        if (!state.lastSyncedAt) {
          console.log('[SyncStore] Auto-sync allowed: no previous sync');
          return true;
        }

        const timeSinceLastSync = Date.now() - state.lastSyncedAt;
        const canSync = timeSinceLastSync >= AUTO_SYNC_BLOCK_THRESHOLD;

        console.log('[SyncStore] Auto-sync check:', {
          timeSinceLastSync: Math.floor(timeSinceLastSync / 60000) + ' minutes',
          threshold: Math.floor(AUTO_SYNC_BLOCK_THRESHOLD / 60000) + ' minutes',
          canSync
        });

        return canSync;
      },

      startSync: (source: SyncSource) => {
        const state = get();
        if (state.isSyncing) {
          console.log('[SyncStore] Sync blocked: already syncing from', state.syncSource);
          return false;
        }

        console.log('[SyncStore] Starting sync from:', source);
        set({
          isSyncing: true,
          syncSource: source,
          lastSyncError: null
        });
        return true;
      },

      completeSync: (error?: string) => {
        const state = get();
        console.log('[SyncStore] Sync completed:', {
          source: state.syncSource,
          hadError: !!error,
          timestamp: new Date().toISOString()
        });

        set({
          lastSyncedAt: error ? state.lastSyncedAt : Date.now(),
          isSyncing: false,
          syncSource: null,
          lastSyncError: error || null
        });
      },

      getTimeSinceLastSync: () => {
        const state = get();
        if (!state.lastSyncedAt) return null;
        return Date.now() - state.lastSyncedAt;
      },

      reset: () => {
        console.log('[SyncStore] Resetting sync state');
        set({
          lastSyncedAt: null,
          isSyncing: false,
          syncSource: null,
          lastSyncError: null
        });
      }
    }),
    {
      name: 'sync-store',
      partialize: (state) => ({
        lastSyncedAt: state.lastSyncedAt,
        lastSyncError: state.lastSyncError
      })
    }
  )
);

export const formatTimeSinceSync = (ms: number | null): string => {
  if (ms === null) return 'Never';

  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};
