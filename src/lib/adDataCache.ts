import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdDataCache {
  // Cached data
  performanceData: any | null;
  creatives: any[];
  campaigns: any[];
  adSets: any[];

  // Metadata
  lastFetchedAt: number | null;
  dateRange: { startDate: string; endDate: string } | null;

  // Actions
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
    age: number | null; // Age in minutes
    isStale: boolean; // > 10 minutes
    isVeryStale: boolean; // > 30 minutes
    dateRangeMatches: boolean;
  };

  clearCache: () => void;
}

const CACHE_FRESH_THRESHOLD = 10 * 60 * 1000; // 10 minutes
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

      setCachedData: (data) => {
        console.log('[AdDataCache] Caching data:', {
          creatives: data.creatives.length,
          campaigns: data.campaigns.length,
          adSets: data.adSets.length,
          dateRange: data.dateRange,
          timestamp: new Date().toISOString()
        });

        set({
          performanceData: data.performanceData,
          creatives: data.creatives,
          campaigns: data.campaigns,
          adSets: data.adSets,
          lastFetchedAt: Date.now(),
          dateRange: data.dateRange
        });
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

        // Calculate age
        const ageMs = Date.now() - state.lastFetchedAt;
        const ageMinutes = Math.floor(ageMs / 60000);
        const isStale = ageMs > CACHE_FRESH_THRESHOLD;
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

      clearCache: () => {
        console.log('[AdDataCache] Clearing cache');
        set({
          performanceData: null,
          creatives: [],
          campaigns: [],
          adSets: [],
          lastFetchedAt: null,
          dateRange: null
        });
      }
    }),
    {
      name: 'ad-data-cache',
      // Only persist for current session (cleared on browser close)
      partialize: (state) => ({
        performanceData: state.performanceData,
        creatives: state.creatives,
        campaigns: state.campaigns,
        adSets: state.adSets,
        lastFetchedAt: state.lastFetchedAt,
        dateRange: state.dateRange
      })
    }
  )
);
