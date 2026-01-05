import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { SyncJob } from '../../lib/facebookSyncOrchestrator';
import { toast } from 'sonner';

export function BackgroundSyncIndicator() {
  const { user } = useAuth();
  const [activeSyncJob, setActiveSyncJob] = useState<SyncJob | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check for active Phase 2 (historical backfill) sync jobs
    const checkActiveSyncs = async () => {
      const { data, error } = await supabase
        .from('sync_jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('sync_phase', 'historical_backfill')
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setActiveSyncJob(data);
        setShouldShow(true);
      } else {
        setActiveSyncJob(null);
        setShouldShow(false);
      }
    };

    checkActiveSyncs();

    // Poll every 5 seconds
    const pollInterval = setInterval(checkActiveSyncs, 5000);

    // Subscribe to sync job updates
    const subscription = supabase
      .channel('sync_job_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sync_jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedJob = payload.new as SyncJob;

          if (updatedJob.sync_phase === 'historical_backfill') {
            if (updatedJob.status === 'completed') {
              // Show completion toast
              toast.success('Historical data sync complete!', {
                description: 'You now have full year-over-year insights.',
                duration: 5000,
              });
              setActiveSyncJob(null);
              setShouldShow(false);
            } else if (updatedJob.status === 'in_progress' || updatedJob.status === 'pending') {
              setActiveSyncJob(updatedJob);
              setShouldShow(true);
            } else {
              setActiveSyncJob(null);
              setShouldShow(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      subscription.unsubscribe();
    };
  }, [user]);

  if (!shouldShow || !activeSyncJob) return null;

  return (
    <>
      {/* Floating Badge */}
      <div
        className="fixed top-4 right-4 z-50 cursor-pointer group"
        onClick={() => setShowDetails(true)}
      >
        <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg border-2 border-blue-500 px-4 py-2 flex items-center gap-2 hover:shadow-xl transition-all">
          <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-900 dark:text-white">
              Syncing Historical Data
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {activeSyncJob.progress_percentage}% complete
            </span>
          </div>
        </div>

        {/* Tooltip */}
        <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Click to view details
          <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45" />
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white relative">
              <button
                onClick={() => setShowDetails(false)}
                className="absolute top-4 right-4 hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <div>
                  <h2 className="text-lg font-semibold">Historical Data Sync</h2>
                  <p className="text-sm text-blue-100 mt-1">
                    Running in background
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Progress</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {activeSyncJob.progress_percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${activeSyncJob.progress_percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {activeSyncJob.completed_chunks} of {activeSyncJob.total_chunks} chunks
                  </span>
                  {activeSyncJob.failed_chunks > 0 && (
                    <span className="text-yellow-600 dark:text-yellow-400">
                      {activeSyncJob.failed_chunks} failed
                    </span>
                  )}
                </div>
              </div>

              {/* Current Activity */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                  Current Activity
                </h3>
                <p className="text-xs text-blue-800 dark:text-blue-400">
                  {activeSyncJob.current_chunk_type === 'campaign_metrics' && 'Syncing campaign metrics...'}
                  {activeSyncJob.current_chunk_type === 'adset_metrics' && 'Syncing ad set metrics...'}
                  {activeSyncJob.current_chunk_type === 'ad_metrics' && 'Syncing ad metrics...'}
                  {!activeSyncJob.current_chunk_type && 'Processing data...'}
                </p>
              </div>

              {/* Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  What's happening?
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Recent 90 days already synced</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0 animate-spin" />
                    <span>Backfilling historical data for deeper insights</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>You can continue using the app normally</span>
                  </li>
                </ul>
              </div>

              {/* Date Range */}
              {activeSyncJob.historical_start_date && activeSyncJob.historical_end_date && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  Syncing from{' '}
                  {new Date(activeSyncJob.historical_start_date).toLocaleDateString()}{' '}
                  to{' '}
                  {new Date(activeSyncJob.historical_end_date).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowDetails(false)}
                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
