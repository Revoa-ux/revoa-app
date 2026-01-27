import React, { useState, useCallback, useEffect } from 'react';
import { Zap, Play, Clock, CheckCircle2, XCircle, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from '../../lib/toast';
import { supabase } from '@/lib/supabase';

interface ImportJob {
  id: string;
  created_by?: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  mode: 'real' | 'demo';
  niche?: string;
  import_type?: 'autonomous' | 'hybrid';
  product_name?: string;
  amazon_url?: string;
  aliexpress_url?: string;
  sample_reel_url?: string;
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
  const [reelUrls, setReelUrls] = useState<string>('');

  const [productTitle, setProductTitle] = useState<string>('');
  const [instagramReelUrl, setInstagramReelUrl] = useState<string>('');
  const [amazonUrl, setAmazonUrl] = useState<string>('');
  const [aliexpressUrl, setAliexpressUrl] = useState<string>('');
  const [amazonPrice, setAmazonPrice] = useState<string>('');
  const [aliexpressPrice, setAliexpressPrice] = useState<string>('');
  const [suggestedRetailPrice, setSuggestedRetailPrice] = useState<string>('');

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

      // Parse reel URLs if provided
      const urls = reelUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url && (url.includes('instagram.com/reel/') || url.includes('instagram.com/p/')));

      const payload: any = {
        mode,
        niche: 'all'
      };

      if (urls.length > 0) {
        payload.reel_urls = urls;
      }

      if (productTitle) payload.product_name = productTitle;
      if (instagramReelUrl) payload.sample_reel_url = instagramReelUrl;
      if (amazonUrl) payload.amazon_url = amazonUrl;
      if (aliexpressUrl) payload.aliexpress_url = aliexpressUrl;
      if (amazonPrice) payload.amazon_price = amazonPrice;
      if (aliexpressPrice) payload.aliexpress_price = aliexpressPrice;
      if (suggestedRetailPrice) payload.suggested_retail_price = suggestedRetailPrice;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-dispatch`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
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
      setReelUrls('');
      setProductTitle('');
      setInstagramReelUrl('');
      setAmazonUrl('');
      setAliexpressUrl('');
      setAmazonPrice('');
      setAliexpressPrice('');
      setSuggestedRetailPrice('');
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
          <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-2">AI Agent Product Import</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 flex items-start sm:items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></span>
            Run the AI agent to find and import winning products automatically
          </p>
        </div>
        <button
          onClick={fetchJobs}
          disabled={loading}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          title="Refresh jobs"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {lastError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1 whitespace-pre-wrap">{lastError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-dark rounded-xl shadow-sm border border-gray-200 dark:border-[#3a3a3a] p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Hybrid AI Product Import</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Provide basic product information below. The AI agent will automatically generate product images, GIFs, and marketing copy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="product-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Title <span className="text-red-500">*</span>
            </label>
            <input
              id="product-title"
              type="text"
              value={productTitle}
              onChange={(e) => setProductTitle(e.target.value)}
              placeholder="e.g., Solar LED Garden Lights"
              className="w-full px-4 py-2.5 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="instagram-reel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Instagram Reel URL <span className="text-red-500">*</span>
            </label>
            <input
              id="instagram-reel"
              type="url"
              value={instagramReelUrl}
              onChange={(e) => setInstagramReelUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/ABC123/"
              className="w-full px-4 py-2.5 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="amazon-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amazon Product URL
            </label>
            <input
              id="amazon-url"
              type="url"
              value={amazonUrl}
              onChange={(e) => setAmazonUrl(e.target.value)}
              placeholder="https://www.amazon.com/dp/..."
              className="w-full px-4 py-2.5 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="aliexpress-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              AliExpress Product URL
            </label>
            <input
              id="aliexpress-url"
              type="url"
              value={aliexpressUrl}
              onChange={(e) => setAliexpressUrl(e.target.value)}
              placeholder="https://www.aliexpress.com/item/..."
              className="w-full px-4 py-2.5 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="amazon-price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amazon Price (USD)
            </label>
            <input
              id="amazon-price"
              type="number"
              step="0.01"
              value={amazonPrice}
              onChange={(e) => setAmazonPrice(e.target.value)}
              placeholder="29.99"
              className="w-full px-4 py-2.5 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="aliexpress-price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              AliExpress Price (USD)
            </label>
            <input
              id="aliexpress-price"
              type="number"
              step="0.01"
              value={aliexpressPrice}
              onChange={(e) => setAliexpressPrice(e.target.value)}
              placeholder="12.50"
              className="w-full px-4 py-2.5 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="suggested-retail-price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Suggested Retail Price (USD)
            </label>
            <input
              id="suggested-retail-price"
              type="number"
              step="0.01"
              value={suggestedRetailPrice}
              onChange={(e) => setSuggestedRetailPrice(e.target.value)}
              placeholder="49.99"
              className="w-full px-4 py-2.5 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mb-6 border-t border-gray-200 dark:border-[#3a3a3a] pt-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Or use autonomous discovery mode:</h3>
          <label htmlFor="reel-urls" className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
            Instagram Reel URLs (Optional - for autonomous mode)
          </label>
          <textarea
            id="reel-urls"
            value={reelUrls}
            onChange={(e) => setReelUrls(e.target.value)}
            placeholder="Paste Instagram reel URLs here, one per line:
https://www.instagram.com/reel/ABC123/
https://www.instagram.com/reel/DEF456/"
            rows={4}
            className="w-full px-4 py-3 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-y font-mono text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {reelUrls.split('\n').filter(url => url.trim() && (url.includes('instagram.com/reel/') || url.includes('instagram.com/p/'))).length} valid URLs detected
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => runAgent('real')}
            disabled={running || (!productTitle && !instagramReelUrl && reelUrls.split('\n').filter(url => url.trim() && (url.includes('instagram.com/reel/') || url.includes('instagram.com/p/'))).length === 0)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm"
          >
            <Zap className="w-4 h-4" />
            {productTitle ? 'Generate Product Assets' : 'Run Autonomous Discovery'}
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
          {productTitle ? (
            <span><strong>Hybrid Mode:</strong> AI will download the reel, generate GIFs and images, scrape prices (if not provided), and create marketing copy.</span>
          ) : (
            <span><strong>Autonomous Mode:</strong> AI will discover products from provided reels or search Instagram automatically.</span>
          )}
        </p>
      </div>

      <div className="bg-white dark:bg-dark rounded-xl shadow-sm border border-gray-200 dark:border-[#3a3a3a]">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Jobs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#3a3a3a]/50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Product/Niche</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Started</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Results</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#3a3a3a]">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No jobs yet. Click "Run AI Agent" to start.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 dark:bg-dark/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{job.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">{job.import_type || 'autonomous'}</span>
                        {job.mode === 'demo' && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">demo</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {job.import_type === 'hybrid' && job.product_name ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{job.product_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 mt-1">
                            {job.amazon_url && <div>Amazon: Yes</div>}
                            {job.aliexpress_url && <div>AliExpress: Yes</div>}
                            {job.sample_reel_url && <div>Reel: Yes</div>}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-700 dark:text-gray-300">{job.niche || 'all'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {job.started_at ? formatDate(job.started_at) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatDuration(job.started_at, job.finished_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {job.summary ? (
                        <div className="text-sm font-medium">
                          <span className="text-green-600 dark:text-green-400">{job.summary.successful}</span>
                          {' / '}
                          <span className="text-red-600 dark:text-red-400">{job.summary.failed}</span>
                          {' / '}
                          <span className="text-gray-600 dark:text-gray-400">{job.summary.total}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {job.github_run_url && (
                        <a
                          href={job.github_run_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                        >
                          View Run
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {job.error_text && (
                        <details className="text-sm text-red-600 dark:text-red-400">
                          <summary className="cursor-pointer hover:underline font-medium">Error</summary>
                          <p className="mt-1 text-xs whitespace-pre-wrap text-red-700 dark:text-red-300">{job.error_text}</p>
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
