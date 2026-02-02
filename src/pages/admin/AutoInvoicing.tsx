import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, Settings as SettingsIcon, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '../../lib/toast';
import Layout from '@/components/admin/Layout';
import GlassCard from '@/components/GlassCard';

interface InvoiceSettings {
  user_id: string;
  auto_generate_enabled: boolean;
  generation_frequency: string;
  minimum_amount: number;
  user_timezone: string;
}

interface GenerationLog {
  id: string;
  user_id: string;
  invoice_id: string | null;
  status: string;
  line_items_count: number;
  total_amount: number;
  orders_processed: number;
  error_message: string | null;
  created_at: string;
  user_email: string;
}

export default function AutoInvoicing() {
  const [settings, setSettings] = useState<InvoiceSettings[]>([]);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('invoice_generation_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (settingsError) throw settingsError;

      // Fetch logs with user emails
      const { data: logsData, error: logsError } = await supabase
        .from('invoice_generation_logs')
        .select(`
          *,
          user_profiles!inner(email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;

      setSettings(settingsData || []);
      setLogs(
        (logsData || []).map(log => ({
          ...log,
          user_email: log.user_profiles?.email || 'Unknown',
        }))
      );
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserAutoGeneration = async (userId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('invoice_generation_settings')
        .update({ auto_generate_enabled: !currentState })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(`Auto-invoicing ${!currentState ? 'enabled' : 'disabled'}`);
      fetchData();
    } catch (error) {
      console.error('Error toggling auto-generation:', error);
      toast.error('Failed to update settings');
    }
  };

  const syncAllOrders = async () => {
    try {
      setSyncing(true);
      toast.info('Syncing orders for all users...');

      // Get all users with Shopify connected
      const { data: installations } = await supabase
        .from('shopify_installations')
        .select('user_id, store_url, access_token')
        .is('uninstalled_at', null);

      if (!installations || installations.length === 0) {
        toast.error('No active Shopify connections found');
        return;
      }

      let successCount = 0;
      for (const install of installations) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-shopify-orders`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: install.user_id,
                storeUrl: install.store_url,
                accessToken: install.access_token,
              }),
            }
          );

          if (response.ok) successCount++;
        } catch (error) {
          console.error(`Error syncing for user ${install.user_id}:`, error);
        }
      }

      toast.success(`Synced orders for ${successCount} users`);
      fetchData();
    } catch (error) {
      console.error('Error syncing orders:', error);
      toast.error('Failed to sync orders');
    } finally {
      setSyncing(false);
    }
  };

  const generateInvoicesNow = async () => {
    try {
      setGenerating(true);
      toast.info('Generating invoices...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-auto-invoices`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to generate invoices');

      const result = await response.json();
      toast.success(`Generated ${result.generated} invoices`);
      fetchData();
    } catch (error) {
      console.error('Error generating invoices:', error);
      toast.error('Failed to generate invoices');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#171717] dark:to-[#2a2a2a] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Auto-Invoicing Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage automated invoice generation and sync orders
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={syncAllOrders}
                disabled={syncing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync All Orders'}</span>
              </button>
              <button
                onClick={generateInvoicesNow}
                disabled={generating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>{generating ? 'Generating...' : 'Generate Now'}</span>
              </button>
            </div>
          </div>

          {/* Settings */}
          <GlassCard>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <SettingsIcon className="w-5 h-5 mr-2" />
                User Settings
              </h2>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : settings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No users configured</div>
              ) : (
                <div className="space-y-3">
                  {settings.map(setting => (
                    <div
                      key={setting.user_id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          User ID: {setting.user_id}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Min Amount: ${setting.minimum_amount} | Frequency: {setting.generation_frequency}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleUserAutoGeneration(setting.user_id, setting.auto_generate_enabled)}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                          setting.auto_generate_enabled
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {setting.auto_generate_enabled ? (
                          <>
                            <Pause className="w-4 h-4" />
                            <span>Enabled</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span>Disabled</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Logs */}
          <GlassCard>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Generation Logs
              </h2>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No generation logs yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-[#3a3a3a]">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">User</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Items</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Orders</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id} className="border-b border-gray-100 dark:border-[#2a2a2a]">
                          <td className="py-3 px-4">
                            {log.status === 'success' ? (
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                <span className="text-sm">Success</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-red-600">
                                <XCircle className="w-4 h-4 mr-2" />
                                <span className="text-sm">Failed</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {log.user_email}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                            ${log.total_amount?.toFixed(2) || '0.00'}
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">
                            {log.line_items_count}
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">
                            {log.orders_processed}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </Layout>
  );
}
