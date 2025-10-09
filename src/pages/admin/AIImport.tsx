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
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Agent Product Import</h1>
          <p className="text-gray-600 flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            Run the AI agent to find and import winning products automatically
          </p>
        </div>
        <button
          onClick={fetchJobs}
          disabled={loading}
          className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          title="Refresh jobs"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {lastError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">{lastError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Run Import</h2>
        <div className="flex gap-3">
          <button
            onClick={() => runAgent('demo')}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            <Play className="w-4 h-4" />
            Run Demo Mode
          </button>
          <button
            onClick={() => runAgent('real')}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm"
          >
            <Zap className="w-4 h-4" />
            Run AI Agent (Real Mode)
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          <strong>Demo:</strong> Quick test (no GitHub). <strong>Real Mode:</strong> Full AI import via GitHub Actions.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mode</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Niche</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Started</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Results</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No jobs yet. Click "Run AI Agent" to start.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className="text-sm font-medium text-gray-900 capitalize">{job.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">{job.mode}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{job.niche || 'all'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {job.started_at ? formatDate(job.started_at) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDuration(job.started_at, job.finished_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {job.summary ? (
                        <div className="text-sm font-medium">
                          <span className="text-green-600">{job.summary.successful}</span>
                          {' / '}
                          <span className="text-red-600">{job.summary.failed}</span>
                          {' / '}
                          <span className="text-gray-600">{job.summary.total}</span>
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
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                        >
                          View Run
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {job.error_text && (
                        <details className="text-sm text-red-600">
                          <summary className="cursor-pointer hover:underline font-medium">Error</summary>
                          <p className="mt-1 text-xs whitespace-pre-wrap text-red-700">{job.error_text}</p>
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
