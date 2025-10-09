import React, { useState, useCallback, useEffect } from 'react';
import { Zap, Play, Clock, CheckCircle2, XCircle, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ImportJob {
  id: string;
  created_by?: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  mode: 'real' | 'demo';
  niche?: string;
  started_at?: string;
  finished_at?: string;
  github_run_url?: string;
  error_text?: string;
  summary?: {
    total: number;
    successful: number;
    failed: number;
    skipped?: Array<{ external_id: string; reason: string }>;
  };
  created_at: string;
}

export default function AIImport() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastError, setLastError] = useState<string>('');

  const fetchJobs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('import_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const runAgent = async (mode: 'real' | 'demo') => {
    setRunning(true);
    setLastError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-dispatch`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mode, niche: 'all' })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        const errorMsg = result.error || 'Failed to start agent';
        setLastError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      toast.success(mode === 'demo' ? 'Demo completed!' : 'AI agent started! Check status below.');
      fetchJobs();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start agent';
      setLastError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const formatDuration = (started?: string, finished?: string) => {
    if (!started || !finished) return '-';
    const duration = new Date(finished).getTime() - new Date(started).getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Agent Product Import</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Run the AI agent to find and import winning products automatically
          </p>
        </div>
        <button
          onClick={fetchJobs}
          disabled={loading}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {lastError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1 whitespace-pre-wrap">{lastError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Run Import</h2>
        <div className="flex gap-4">
          <button
            onClick={() => runAgent('demo')}
            disabled={running}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-5 h-5" />
            Run Demo Mode
          </button>
          <button
            onClick={() => runAgent('real')}
            disabled={running}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Zap className="w-5 h-5" />
            Run AI Agent (Real Mode)
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
          <strong>Demo:</strong> Quick test (no GitHub). <strong>Real Mode:</strong> Full AI import via GitHub Actions.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Jobs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Niche</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Started</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Results</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No jobs yet. Click "Run AI Agent" to start.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className="text-sm text-gray-900 dark:text-white capitalize">{job.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white capitalize">{job.mode}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">{job.niche || 'all'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {job.started_at ? formatDate(job.started_at) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatDuration(job.started_at, job.finished_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {job.summary ? (
                        <div className="text-sm">
                          <span className="text-green-600 dark:text-green-400">{job.summary.successful}</span>
                          {' / '}
                          <span className="text-red-600 dark:text-red-400">{job.summary.failed}</span>
                          {' / '}
                          <span className="text-gray-600 dark:text-gray-400">{job.summary.total}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {job.github_run_url && (
                        <a
                          href={job.github_run_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View Run
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {job.error_text && (
                        <details className="text-sm text-red-600 dark:text-red-400">
                          <summary className="cursor-pointer hover:underline">Error</summary>
                          <p className="mt-1 text-xs whitespace-pre-wrap">{job.error_text}</p>
                        </details>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
