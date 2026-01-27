import React, { useState, useEffect } from 'react';
import { DollarSign, Download, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '../../lib/toast';

interface WireTransferSummary {
  month: string;
  total_transfers: number;
  total_amount: number;
  platform_fee: number;
  supplier_net: number;
  transfer_count: number;
}

interface WireTransferDetail {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  platform_fee: number;
  supplier_amount: number;
  wire_reference_number: string;
  created_at: string;
  confirmed_at: string;
}

export default function WireTransferReport() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [summary, setSummary] = useState<WireTransferSummary | null>(null);
  const [details, setDetails] = useState<WireTransferDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableMonths();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      loadMonthlyReport(selectedMonth);
    }
  }, [selectedMonth]);

  const loadAvailableMonths = async () => {
    try {
      // Get all months that have wire transfers
      const { data, error } = await supabase
        .from('payment_intents')
        .select('created_at')
        .eq('payment_method', 'wire')
        .eq('status', 'succeeded')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Extract unique months
      const months = new Set<string>();
      data?.forEach(record => {
        const date = new Date(record.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthKey);
      });

      const monthsArray = Array.from(months).sort().reverse();
      setAvailableMonths(monthsArray);

      // Auto-select current month if available
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      if (monthsArray.includes(currentMonth)) {
        setSelectedMonth(currentMonth);
      } else if (monthsArray.length > 0) {
        setSelectedMonth(monthsArray[0]);
      }
    } catch (error) {
      console.error('Error loading months:', error);
    }
  };

  const loadMonthlyReport = async (month: string) => {
    try {
      setLoading(true);

      const [year, monthNum] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);

      // Get all wire transfers for this month
      const { data: transfers, error } = await supabase
        .from('payment_intents')
        .select(`
          *,
          user_profiles!payment_intents_user_id_fkey (
            email
          )
        `)
        .eq('payment_method', 'wire')
        .eq('status', 'succeeded')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate summary
      const totalAmount = transfers?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalPlatformFee = transfers?.reduce((sum, t) => sum + t.platform_fee, 0) || 0;
      const totalSupplierNet = transfers?.reduce((sum, t) => sum + t.supplier_amount, 0) || 0;

      setSummary({
        month,
        total_transfers: transfers?.length || 0,
        total_amount: totalAmount,
        platform_fee: totalPlatformFee,
        supplier_net: totalSupplierNet,
        transfer_count: transfers?.length || 0,
      });

      // Format details
      const formattedDetails: WireTransferDetail[] = transfers?.map(t => ({
        id: t.id,
        user_id: t.user_id,
        user_email: (t.user_profiles as any)?.email || 'Unknown',
        amount: t.amount,
        platform_fee: t.platform_fee,
        supplier_amount: t.supplier_amount,
        wire_reference_number: t.wire_reference_number,
        created_at: t.created_at,
        confirmed_at: t.confirmed_at,
      })) || [];

      setDetails(formattedDetails);
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Failed to load wire transfer report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!summary || details.length === 0) return;

    const headers = ['Date', 'User Email', 'Reference', 'Transfer Amount', 'Platform Fee (3%)', 'Supplier Net'];
    const rows = details.map(d => [
      new Date(d.created_at).toLocaleDateString(),
      d.user_email,
      d.wire_reference_number,
      d.amount.toFixed(2),
      d.platform_fee.toFixed(2),
      d.supplier_amount.toFixed(2),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      '',
      `Total Transfers,,,${summary.total_amount.toFixed(2)},${summary.platform_fee.toFixed(2)},${summary.supplier_net.toFixed(2)}`,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wire-transfers-${summary.month}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Report exported successfully');
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Wire Transfer Commission Report
        </h1>
        <div className="flex items-start sm:items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monthly wire transfer totals for supplier invoicing
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {availableMonths.map(month => (
              <option key={month} value={month}>
                {formatMonth(month)}
              </option>
            ))}
          </select>
        </div>

        {summary && (
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading report...</p>
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Transfers</span>
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {summary.transfer_count}
              </p>
            </div>

            <div className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Amount</span>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${summary.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Platform Fee (3%)</span>
                <DollarSign className="w-5 h-5 text-primary-500" />
              </div>
              <p className="text-2xl font-semibold text-primary-600 dark:text-primary-400">
                ${summary.platform_fee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Invoice supplier for this amount</p>
            </div>

            <div className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Supplier Net</span>
                <DollarSign className="w-5 h-5 text-gray-500" />
              </div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${summary.supplier_net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#3a3a3a]">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#3a3a3a]">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#3a3a3a]">Reference</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#3a3a3a]">Transfer Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#3a3a3a]">Platform Fee</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#3a3a3a]">Supplier Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-[#3a3a3a]">
                  {details.map((detail) => (
                    <tr key={detail.id} className="hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {new Date(detail.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {detail.user_email}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-gray-400">
                        {detail.wire_reference_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-100">
                        ${detail.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-primary-600 dark:text-primary-400 font-medium">
                        ${detail.platform_fee.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-100">
                        ${detail.supplier_amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-dark/50 font-semibold">
                    <td colSpan={3} className="px-6 py-4 text-sm text-gray-900 dark:text-white">Total</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">
                      ${summary.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-primary-600 dark:text-primary-400">
                      ${summary.platform_fee.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">
                      ${summary.supplier_net.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No wire transfers found for the selected period</p>
        </div>
      )}
    </div>
  );
}
