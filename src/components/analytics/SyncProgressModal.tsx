import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { SyncJob } from '../../lib/facebookSyncOrchestrator';

interface SyncProgressModalProps {
  isOpen: boolean;
  syncJobId: string;
  onComplete: () => void;
  onError: (error: string) => void;
}

export function SyncProgressModal({ isOpen, syncJobId, onComplete, onError }: SyncProgressModalProps) {
  const [syncJob, setSyncJob] = useState<SyncJob | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isOpen || !syncJobId) return;

    // Poll for sync job updates
    const pollInterval = setInterval(async () => {
      const { data, error } = await supabase
        .from('sync_jobs')
        .select('*')
        .eq('id', syncJobId)
        .single();

      if (error) {
        console.error('Error fetching sync job:', error);
        return;
      }

      if (data) {
        setSyncJob(data);

        if (data.status === 'completed') {
          setIsCompleted(true);
          clearInterval(pollInterval);

          // Auto-redirect after 2 seconds
          setTimeout(() => {
            onComplete();
          }, 2000);
        } else if (data.status === 'failed') {
          setHasError(true);
          clearInterval(pollInterval);
          onError(data.error_message || 'Sync failed');
        }
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [isOpen, syncJobId, onComplete, onError]);

  if (!isOpen) return null;

  const getStatusText = () => {
    if (!syncJob) return 'Initializing sync...';

    switch (syncJob.current_chunk_type) {
      case 'structure':
        return 'Discovering your campaigns and ads...';
      case 'campaign_metrics':
        return `Syncing campaign metrics: ${syncJob.completed_chunks}/${syncJob.total_chunks} chunks`;
      case 'adset_metrics':
        return `Syncing ad set metrics: ${syncJob.completed_chunks}/${syncJob.total_chunks} chunks`;
      case 'ad_metrics':
        return `Syncing ad metrics: ${syncJob.completed_chunks}/${syncJob.total_chunks} chunks`;
      default:
        return `Processing: ${syncJob.completed_chunks}/${syncJob.total_chunks} chunks`;
    }
  };

  const getEstimatedTime = () => {
    if (!syncJob || syncJob.total_chunks === 0) return null;

    const remainingChunks = syncJob.total_chunks - syncJob.completed_chunks;
    const avgTimePerChunk = 30; // seconds
    const estimatedSeconds = remainingChunks * avgTimePerChunk;

    if (estimatedSeconds < 60) {
      return `~${estimatedSeconds}s remaining`;
    } else {
      const minutes = Math.ceil(estimatedSeconds / 60);
      return `~${minutes} min remaining`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Syncing Your Facebook Ads Data</h2>
            {!isCompleted && !hasError && (
              <div className="animate-spin">
                <Loader2 className="w-6 h-6" />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Message */}
          <div className="text-center">
            {isCompleted ? (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <CheckCircle2 className="w-16 h-16 text-green-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Sync Complete!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your recent data is ready. We're still syncing historical data in the background.
                </p>
              </div>
            ) : hasError ? (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <AlertCircle className="w-16 h-16 text-red-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Sync Failed
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {syncJob?.error_message || 'An error occurred during sync'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {getStatusText()}
                </p>
                {syncJob && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {getEstimatedTime()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {!isCompleted && !hasError && syncJob && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Progress</span>
                <span>{syncJob.progress_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-[#2a2a2a] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${syncJob.progress_percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Entity Counts */}
          {!hasError && syncJob && (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-50 dark:bg-[#2a2a2a]/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {syncJob.total_campaigns_synced}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Campaigns
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-[#2a2a2a]/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {syncJob.total_adsets_synced}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Ad Sets
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-[#2a2a2a]/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {syncJob.total_ads_synced}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Ads
                </div>
              </div>
            </div>
          )}

          {/* Info Message */}
          {!hasError && !isCompleted && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                We're syncing your recent 90 days of data. Once complete, historical data will continue syncing in the background.
              </p>
            </div>
          )}

          {/* Action Button */}
          {isCompleted && (
            <button
              onClick={onComplete}
              className="btn btn-primary w-full py-3"
            >
              Go to Dashboard
            </button>
          )}

          {hasError && (
            <button
              onClick={() => window.location.reload()}
              className="btn btn-danger w-full py-3"
            >
              Retry Sync
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
