import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdDataCache {
  performanceData: any | null;
  creatives: any[];
  campaigns: any[];
  adSets: any[];

  lastFetchedAt: number | null;
  dateRange: { startDate: string; endDate: string } | null;
  isMarkedStale: boolean;

  setCachedData: (data: {
    performanceData: any;
    creatives: any[];
    campaigns: any[];
    adSets: any[];
    dateRange: { startDate: string; endDate: string };
  }) => void;

  getCachedData: (currentDateRange: { startDate: string; endDate: string }) => {
    data: {
      performanceData: any;
      creatives: any[];
      campaigns: any[];
      adSets: any[];
    } | null;
    age: number | null;
    isStale: boolean;
    isVeryStale: boolean;
    dateRangeMatches: boolean;
  };

  markStale: () => void;
  clearCache: () => void;
}

const CACHE_FRESH_THRESHOLD = 15 * 60 * 1000; // 15 minutes
const CACHE_STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

export const useAdDataCache = create<AdDataCache>()(
  persist(
    (set, get) => ({
      performanceData: null,
      creatives: [],
      campaigns: [],
      adSets: [],
      lastFetchedAt: null,
      dateRange: null,
      isMarkedStale: false,

      setCachedData: (data) => {
        console.log('[AdDataCache] Caching data:', {
          creatives: data.creatives.length,
          campaigns: data.campaigns.length,
          adSets: data.adSets.length,
          dateRange: data.dateRange,
          timestamp: new Date().toISOString()
        });

        try {
          // For large datasets (>1000 items), only cache summary data
          const isLargeDataset = data.creatives.length > 1000 ||
                                 data.campaigns.length > 200 ||
                                 data.adSets.length > 500;

          if (isLargeDataset) {
            console.warn('[AdDataCache] Large dataset detected - caching disabled to avoid quota errors');
            // Store minimal metadata only
            set({
              performanceData: data.performanceData,
              creatives: [],
              campaigns: [],
              adSets: [],
              lastFetchedAt: Date.now(),
              dateRange: data.dateRange
            });
            return;
          }

          set({
            performanceData: data.performanceData,
            creatives: data.creatives,
            campaigns: data.campaigns,
            adSets: data.adSets,
            lastFetchedAt: Date.now(),
            dateRange: data.dateRange,
            isMarkedStale: false
          });
        } catch (error) {
          if (error instanceof Error && error.name === 'QuotaExceededError') {
            console.error('[AdDataCache] Storage quota exceeded - clearing cache and storing minimal data');
            // Clear existing cache and store only metadata
            set({
              performanceData: data.performanceData,
              creatives: [],
              campaigns: [],
              adSets: [],
              lastFetchedAt: Date.now(),
              dateRange: data.dateRange
            });
          } else {
            console.error('[AdDataCache] Error caching data:', error);
          }
        }
      },

      getCachedData: (currentDateRange) => {
        const state = get();

        // No cache exists
        if (!state.lastFetchedAt || !state.dateRange) {
          console.log('[AdDataCache] No cache exists');
          return {
            data: null,
            age: null,
            isStale: true,
            isVeryStale: true,
            dateRangeMatches: false
          };
        }

        // Check if date range matches
        const dateRangeMatches =
          state.dateRange.startDate === currentDateRange.startDate &&
          state.dateRange.endDate === currentDateRange.endDate;

        const ageMs = Date.now() - state.lastFetchedAt;
        const ageMinutes = Math.floor(ageMs / 60000);
        const isStale = state.isMarkedStale || ageMs > CACHE_FRESH_THRESHOLD;
        const isVeryStale = ageMs > CACHE_STALE_THRESHOLD;

        console.log('[AdDataCache] Cache check:', {
          ageMinutes,
          isStale,
          isVeryStale,
          dateRangeMatches,
          cachedDateRange: state.dateRange,
          currentDateRange
        });

        // If date range changed, cache is invalid
        if (!dateRangeMatches) {
          console.log('[AdDataCache] Date range changed, cache invalid');
          return {
            data: null,
            age: ageMinutes,
            isStale: true,
            isVeryStale: true,
            dateRangeMatches: false
          };
        }

        // Return cached data with metadata
        return {
          data: {
            performanceData: state.performanceData,
            creatives: state.creatives,
            campaigns: state.campaigns,
            adSets: state.adSets
          },
          age: ageMinutes,
          isStale,
          isVeryStale,
          dateRangeMatches
        };
      },

      markStale: () => {
        console.log('[AdDataCache] Marking cache as stale');
        set({ isMarkedStale: true });
      },

      clearCache: () => {
        console.log('[AdDataCache] Clearing cache');
        set({
          performanceData: null,
          creatives: [],
          campaigns: [],
          adSets: [],
          lastFetchedAt: null,
          dateRange: null,
          isMarkedStale: false
        });
      }
    }),
    {
      name: 'ad-data-cache',
      partialize: (state) => ({
        performanceData: state.performanceData,
        creatives: state.creatives,
        campaigns: state.campaigns,
        adSets: state.adSets,
        lastFetchedAt: state.lastFetchedAt,
        dateRange: state.dateRange,
        isMarkedStale: state.isMarkedStale
      })
    }
  )
);
