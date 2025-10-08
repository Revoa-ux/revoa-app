import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle2, XCircle, Clock, RefreshCw, AlertCircle, ExternalLink, Zap, ChevronDown } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useClickOutside } from '@/lib/useClickOutside';

interface ImportJob {
  id: string;
  filename?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  source: string;
  created_at: string;
  completed_at?: string;
  total_products?: number;
  successful_imports?: number;
  failed_imports?: number;
  skipped_imports?: number;
  github_run_id?: string;
  github_run_url?: string;
  triggered_by?: string;
  error?: string;
}

export default function AIImport() {
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setShowModeDropdown(false));

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
  }, [fetchJobs]);

  const uploadFile = async (file: File) => {
    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-import-upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();

      toast.success(`Import started! ${result.summary?.total || 0} product(s) queued.`);
      fetchJobs();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const allowedTypes = ['.yml', '.yaml', '.csv', '.zip'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedTypes.includes(fileExt)) {
      toast.error('Invalid file type. Please upload YAML, CSV, or ZIP files only.');
      return;
    }

    await uploadFile(file);
  }, []);

  const triggerAIAgent = async (mode: 'real' | 'demo' = 'real') => {
    setUploading(true);
    setShowModeDropdown(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const modeLabel = mode === 'demo' ? 'Demo mode' : 'Real AI agent';
      toast.info(`Starting ${modeLabel}...`);

      // Call the agent-dispatch edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-dispatch`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mode,
            max_products: mode === 'demo' ? 5 : 10
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || 'Failed to start AI agent');
      }

      const result = await response.json();

      if (mode === 'demo') {
        toast.success(`${result.message} (Demo mode)`);
      } else {
        toast.success(result.message || 'AI agent workflow started!');
      }

      // Refresh jobs list
      fetchJobs();

      // Set up polling for real mode only
      if (mode === 'real') {
        const pollInterval = setInterval(() => {
          fetchJobs();
        }, 5000);

        // Stop polling after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
        }, 300000);
      }
    } catch (error) {
      console.error('Agent dispatch error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to trigger AI agent');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/yaml': ['.yml', '.yaml'],
      'text/csv': ['.csv'],
      'application/zip': ['.zip']
    },
    maxFiles: 1,
    disabled: uploading
  });

  const reprocessJob = async (jobId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-import-reprocess`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ job_id: jobId })
        }
      );

      if (!response.ok) throw new Error('Reprocess failed');

      toast.success('Reprocessing job...');
      fetchJobs();
    } catch (error) {
      console.error('Reprocess error:', error);
      toast.error('Failed to reprocess job');
    }
  };

  const getStatusIcon = (status: ImportJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'queued':
        return <Clock className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ImportJob['status']) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      queued: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Agent Import</h1>
            <p className="text-gray-600">Trigger real product research or test with demo data</p>
          </div>

          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-0">
              <button
                onClick={() => triggerAIAgent('real')}
                disabled={uploading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-l-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Zap className="w-5 h-5" />
                {uploading ? 'Starting...' : 'Run AI Agent'}
              </button>
              <button
                onClick={() => setShowModeDropdown(!showModeDropdown)}
                disabled={uploading}
                className="px-3 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-r-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed border-l border-blue-500"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {showModeDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10">
                <button
                  onClick={() => triggerAIAgent('real')}
                  disabled={uploading}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-900">Real Mode (Default)</div>
                      <div className="text-sm text-gray-600">Runs Python agent via GitHub Actions</div>
                    </div>
                  </div>
                </button>

                <div className="border-t border-gray-200 my-1"></div>

                <button
                  onClick={() => triggerAIAgent('demo')}
                  disabled={uploading}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-900">Demo Mode</div>
                      <div className="text-sm text-gray-600">Instant test with 5 sample products</div>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">How It Works:</p>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-blue-900">Real Mode (Default):</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 ml-2">
                    <li>Triggers GitHub Actions workflow with your Python agent</li>
                    <li>Scrapes Instagram/TikTok for winning products</li>
                    <li>Validates pricing: AliExpress ≤ 50% of Amazon OR $20+ spread</li>
                    <li>Auto-generates text-free GIFs and uploads assets</li>
                    <li>Products appear in Product Approvals for your review</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-blue-900">Demo Mode:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 ml-2">
                    <li>Instantly creates 5 sample products for testing</li>
                    <li>No external API calls or asset generation</li>
                    <li>Perfect for UI testing and workflow verification</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={`
            bg-white rounded-2xl border-2 border-dashed p-12 mb-8 cursor-pointer
            transition-all duration-200
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="text-center">
            <Upload className={`w-16 h-16 mx-auto mb-4 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
            {uploading ? (
              <div>
                <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-lg font-medium text-gray-700">Processing...</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {isDragActive ? 'Drop file here' : 'Drag & drop file here'}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  or click to browse
                </p>
                <p className="text-xs text-gray-400">
                  Accepts: .yml, .yaml, .csv, .zip (max 1 file)
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Imports</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No import jobs yet</p>
              <p className="text-sm text-gray-400 mt-2">Upload a file to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Results
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(job.status)}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {job.source === 'ai_agent' ? 'AI Agent (Real)' :
                               job.source === 'demo' ? 'Demo Mode' :
                               job.source === 'admin_trigger' ? 'AI Agent' :
                               job.filename || job.source}
                            </div>
                            {job.source === 'ai_agent' && (
                              <div className="text-xs text-gray-500">GitHub Actions</div>
                            )}
                            {job.source === 'demo' && (
                              <div className="text-xs text-gray-500">Sample Data</div>
                            )}
                            {job.source === 'admin_trigger' && (
                              <div className="text-xs text-gray-500">Automated Research</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(job.status)}
                      </td>
                      <td className="px-6 py-4">
                        {job.total_products !== undefined ? (
                          <div className="text-sm">
                            <div className="text-gray-900">
                              {job.successful_imports || 0}/{job.total_products} imported
                            </div>
                            {(job.failed_imports || 0) > 0 && (
                              <div className="text-red-600">{job.failed_imports} failed</div>
                            )}
                            {(job.skipped_imports || 0) > 0 && (
                              <div className="text-yellow-600">{job.skipped_imports} skipped</div>
                            )}
                          </div>
                        ) : job.error ? (
                          <div className="text-sm text-red-600 max-w-xs truncate" title={job.error}>
                            {job.error}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">
                            {job.status === 'running' ? 'Processing...' : 'Waiting...'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(job.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {job.github_run_url && (
                            <a
                              href={job.github_run_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                              title="View GitHub Actions run"
                            >
                              <ExternalLink className="w-4 h-4" />
                              GitHub
                            </a>
                          )}
                          {job.status === 'failed' && (
                            <button
                              onClick={() => triggerAIAgent('real')}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Retry
                            </button>
                          )}
                          {job.status === 'completed' && job.successful_imports && job.successful_imports > 0 && (
                            <a
                              href="/admin/product-approvals"
                              className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Review
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
