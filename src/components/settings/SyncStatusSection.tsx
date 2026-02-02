import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Database } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FacebookSyncOrchestrator } from '../../lib/facebookSyncOrchestrator';
import { toast } from '../../lib/toast';
import { format, formatDistanceToNow } from 'date-fns';

interface SyncJob {
  id: string;
  sync_phase: 'recent_90_days' | 'historical_backfill';
  sync_type: 'initial' | 'incremental' | 'manual';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  phase_1_completed_at: string | null;
  phase_2_completed_at: string | null;
  created_at: string;
  ad_accounts: { name: string; platform_account_id: string };
}

export function SyncStatusSection() {
  const { user } = useAuth();
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [syncJobs, setSyncJobs] = useState<{ [key: string]: SyncJob | null }>({});
  const [isSyncing, setIsSyncing] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!user) return;

    loadAdAccounts();
  }, [user]);

  const loadAdAccounts = async () => {
    const { data, error } = await supabase
      .from('ad_accounts')
      .select('*')
      .eq('platform', 'facebook')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAdAccounts(data);

      // Load sync status for each account
      data.forEach(account => {
        loadSyncStatus(account.id);
      });
    }
  };

  const loadSyncStatus = async (adAccountId: string) => {
    // Get most recent sync job for this account
    const { data, error } = await supabase
      .from('sync_jobs')
      .select('*, ad_accounts!inner(name, platform_account_id)')
      .eq('ad_account_id', adAccountId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error) {
      setSyncJobs(prev => ({ ...prev, [adAccountId]: data }));
    }
  };

  const handleManualSync = async (account: any) => {
    if (!user) return;

    setIsSyncing(prev => ({ ...prev, [account.id]: true }));

    try {
      const syncJobId = await FacebookSyncOrchestrator.runIncrementalSync(
        user.id,
        account.id
      );

      // Poll for completion and update UI
      const pollInterval = setInterval(async () => {
        const status = await FacebookSyncOrchestrator.getSyncJobStatus(syncJobId);
        await loadSyncStatus(account.id);

        if (status?.status === 'completed') {
          clearInterval(pollInterval);
          setIsSyncing(prev => ({ ...prev, [account.id]: false }));
          toast.success('Sync completed successfully!');
        } else if (status?.status === 'failed') {
          clearInterval(pollInterval);
          setIsSyncing(prev => ({ ...prev, [account.id]: false }));
          toast.error('Sync failed. Please try again.');
        }
      }, 3000);

      // Auto-stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsSyncing(prev => ({ ...prev, [account.id]: false }));
      }, 600000);

    } catch (error) {
      console.error('Error starting sync:', error);
      toast.error('Failed to start sync');
      setIsSyncing(prev => ({ ...prev, [account.id]: false }));
    }
  };

  if (adAccounts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-dark rounded-lg shadow-sm border border-gray-200 dark:border-[#333333] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Data Sync Status
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            View and manage your ad data synchronization
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {adAccounts.map(account => {
          const syncJob = syncJobs[account.id];
          const syncing = isSyncing[account.id];

          return (
            <div
              key={account.id}
              className="bg-gray-50 dark:bg-dark/50 rounded-lg p-4 border border-gray-200 dark:border-[#333333]"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {account.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Platform ID: {account.platform_account_id}
                  </p>
                </div>

                <button
                  onClick={() => handleManualSync(account)}
                  disabled={syncing}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sync Now</span>
                    </>
                  )}
                </button>
              </div>

              {/* Last Synced */}
              {account.last_synced_at && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Last synced {formatDistanceToNow(new Date(account.last_synced_at), { addSuffix: true })}
                  </span>
                </div>
              )}

              {/* Sync Status */}
              {syncJob && (
                <div className="space-y-3">
                  {/* Show inline progress if syncing */}
                  {(syncJob.status === 'in_progress' || syncJob.status === 'pending') && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="relative w-8 h-8">
                            <svg className="w-8 h-8 transform -rotate-90">
                              <circle
                                cx="16"
                                cy="16"
                                r="12"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                fill="none"
                                className="text-blue-200 dark:text-blue-800"
                              />
                              <circle
                                cx="16"
                                cy="16"
                                r="12"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 12}`}
                                strokeDashoffset={`${2 * Math.PI * 12 * (1 - (syncJob.progress_percentage || 0) / 100)}`}
                                className="text-blue-600 dark:text-blue-400 transition-all duration-300"
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[9px] font-semibold text-blue-900 dark:text-blue-100">
                                {Math.round(syncJob.progress_percentage || 0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-0.5">
                            {syncJob.sync_phase === 'recent_90_days' ? 'Syncing recent 90 days' : 'Syncing historical data'}
                          </div>
                          <p className="text-xs text-blue-800 dark:text-blue-200">
                            We're syncing your recent 90 days of data. Once complete, historical data will continue syncing in the background.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Phase 1 (Recent 90 Days)</span>
                    {syncJob.phase_1_completed_at ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete
                      </span>
                    ) : syncJob.sync_phase === 'recent_90_days' && syncJob.status === 'in_progress' ? (
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        {syncJob.progress_percentage}%
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Phase 2 (Historical Backfill)</span>
                    {syncJob.phase_2_completed_at ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete
                      </span>
                    ) : syncJob.sync_phase === 'historical_backfill' && syncJob.status === 'in_progress' ? (
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        {syncJob.progress_percentage}%
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {syncJob.phase_1_completed_at ? 'Queued' : 'Waiting for Phase 1'}
                      </span>
                    )}
                  </div>

                  {/* Completion Dates */}
                  {(syncJob.phase_1_completed_at || syncJob.phase_2_completed_at) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#333333] space-y-1">
                      {syncJob.phase_1_completed_at && (
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Phase 1 completed:</span>
                          <span>{format(new Date(syncJob.phase_1_completed_at), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                      )}
                      {syncJob.phase_2_completed_at && (
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Phase 2 completed:</span>
                          <span>{format(new Date(syncJob.phase_2_completed_at), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* No sync job yet */}
              {!syncJob && account.last_synced_at && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Using legacy sync. Click "Sync Now" to use the new system.
                </div>
              )}

              {!syncJob && !account.last_synced_at && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Not synced yet. Click "Sync Now" to start.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          About Data Sync
        </h4>
        <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-400">
          <li>• Phase 1 syncs your recent 90 days of data (5-15 minutes)</li>
          <li>• Phase 2 backfills historical data in the background</li>
          <li>• Manual sync updates all data from the last sync to now</li>
          <li>• Automatic daily syncs keep your data up to date</li>
        </ul>
      </div>
    </div>
  );
}
