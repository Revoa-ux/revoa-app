import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { useAdmin } from '@/contexts/AdminContext';
import { preShipmentIssueService, type IssueWithDetails, type IssueFilters, type IssueStats } from '@/lib/preShipmentIssueService';
import GlassCard from '@/components/GlassCard';
import { format } from 'date-fns';

export default function PreShipmentIssues() {
  const { isSuperAdmin } = useAdmin();
  const [issues, setIssues] = useState<IssueWithDetails[]>([]);
  const [stats, setStats] = useState<IssueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<IssueFilters>({
    status: 'all',
    hasUnresolvedOnly: false,
  });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadData();
  }, [filters, page]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load issues
      const { data: issuesData, count } = await preShipmentIssueService.getIssues(
        filters,
        page,
        pageSize
      );
      setIssues(issuesData);
      setTotalCount(count);

      // Load stats
      const statsData = await preShipmentIssueService.getIssueStats(
        isSuperAdmin ? undefined : filters.userId
      );
      setStats(statsData);
    } catch (error) {
      console.error('Error loading pre-shipment issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilter = (status: IssueFilters['status']) => {
    setFilters(prev => ({ ...prev, status }));
    setPage(1);
  };

  const handleIssueTypeFilter = (issueType: string) => {
    setFilters(prev => ({
      ...prev,
      issueType: issueType === 'all' ? undefined : issueType as any
    }));
    setPage(1);
  };

  const handleSeverityFilter = (severity: string) => {
    setFilters(prev => ({
      ...prev,
      severity: severity === 'all' ? undefined : severity as any
    }));
    setPage(1);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-dark/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'in_progress': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'pending_customer': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      case 'pending_admin': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'detected': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'notified': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'cancelled': return 'text-gray-600 bg-gray-50 dark:bg-dark/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-dark/20';
    }
  };

  const getIssueTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      inventory_shortage: 'Inventory Shortage',
      quality_issue: 'Quality Issue',
      supplier_delay: 'Supplier Delay',
      out_of_stock: 'Out of Stock',
      damage_detected: 'Damage Detected',
      variant_mismatch: 'Variant Mismatch',
      pricing_error: 'Pricing Error',
      shipping_restriction: 'Shipping Restriction',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const filteredIssues = issues.filter(issue => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      issue.description.toLowerCase().includes(search) ||
      issue.original_product_name?.toLowerCase().includes(search) ||
      issue.order?.order_number?.toLowerCase().includes(search) ||
      issue.original_sku?.toLowerCase().includes(search)
    );
  });

  if (loading && issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Pre-Shipment Issues
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Track and resolve issues detected before order fulfillment
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Issues</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.total}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Critical</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {stats.critical}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unresolved</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {stats.unresolved}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Resolved</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {stats.resolved}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Resolution</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.avg_resolution_time_hours}h
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </GlassCard>
        </div>
      )}

      {/* Filters */}
      <GlassCard className="p-6">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number, SKU, product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
              <div className="flex gap-2">
                {['all', 'detected', 'notified', 'pending_customer', 'pending_admin', 'in_progress', 'resolved', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusFilter(status as any)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      filters.status === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-[#3a3a3a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#4a4a4a]'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Severity:</span>
              <div className="flex gap-2">
                {['all', 'critical', 'high', 'medium', 'low'].map((severity) => (
                  <button
                    key={severity}
                    onClick={() => handleSeverityFilter(severity)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      filters.severity === severity
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-[#3a3a3a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#4a4a4a]'
                    }`}
                  >
                    {severity}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Issues List */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#3a3a3a]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Issue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Detected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#3a3a3a]">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No pre-shipment issues found
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    className="hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {getIssueTypeLabel(issue.issue_type)}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {issue.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-white">
                          #{issue.order?.order_number || 'N/A'}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {issue.order?.customer_email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {issue.original_product_name || 'N/A'}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          SKU: {issue.original_sku || 'N/A'}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          Qty: {issue.affected_quantity}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(
                          issue.severity
                        )}`}
                      >
                        {issue.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          issue.status
                        )}`}
                      >
                        {issue.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(issue.detected_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => {
                          // Navigate to issue detail/resolution page
                          window.location.href = `/admin/pre-shipment-issues/${issue.id}`;
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-[#3a3a3a]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of{' '}
                {totalCount} issues
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= totalCount}
                  className="px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
