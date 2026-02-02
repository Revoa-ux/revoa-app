import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Package,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import { SortField, SortDirection } from '@/types/products';

interface CreativeAnalysisProps {
  creatives?: any[];
  selectedTime?: string;
  onTimeChange?: (time: string) => void;
  searchTerm?: string;
}

interface Column {
  id: string;
  label: string;
  width: number;
  sortable?: boolean;
  render?: (value: any, item: any) => React.ReactNode;
}

export const CreativeAnalysis: React.FC<CreativeAnalysisProps> = ({
  creatives = [],
  searchTerm = ''
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    field: SortField;
    direction: SortDirection;
  }>({
    field: 'sales',
    direction: 'desc'
  });

  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  useClickOutside(filterDropdownRef, () => setShowFilterDropdown(false));
  useClickOutside(sortDropdownRef, () => setShowSortDropdown(false));

  useEffect(() => {
    const tableElement = tableRef.current;
    const headerElement = headerRef.current;

    if (!tableElement || !headerElement) return;

    const handleScroll = () => {
      if (headerElement) {
        headerElement.scrollLeft = tableElement.scrollLeft;
      }
    };

    tableElement.addEventListener('scroll', handleScroll);
    return () => tableElement.removeEventListener('scroll', handleScroll);
  }, []);

  const columns: Column[] = [
    {
      id: 'creative',
      label: 'Creative',
      width: 80,
      render: (_, creative) => {
        const adsManagerUrl = creative.platform === 'facebook' && creative.id && creative.adAccountId
          ? `https://business.facebook.com/adsmanager/manage/ads?act=${creative.adAccountId.replace('act_', '')}&selected_ad_ids=${creative.id}`
          : null;

        return (
          <div className="flex items-center">
            <div className="w-10 h-10 relative rounded-lg overflow-hidden bg-gray-100 dark:bg-[#2a2a2a] group">
              {creative.thumbnail || creative.url ? (
                <img
                  src={creative.thumbnail || creative.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-gray-400" />
                </div>
              )}
              {adsManagerUrl && (
                <a
                  href={adsManagerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-5 h-5 text-white" />
                </a>
              )}
            </div>
          </div>
        );
      }
    },
    { id: 'adName', label: 'Ad Name', width: 200, sortable: true },
    { id: 'platform', label: 'Platform', width: 100, sortable: true },
    { id: 'performance', label: 'Performance', width: 120, sortable: true },
    { id: 'fatigueScore', label: 'Fatigue', width: 100, sortable: true },
    { id: 'impressions', label: 'Impressions', width: 120, sortable: true },
    { id: 'clicks', label: 'Clicks', width: 100, sortable: true },
    { id: 'ctr', label: 'CTR', width: 80, sortable: true },
    { id: 'cpc', label: 'CPC', width: 80, sortable: true },
    { id: 'spend', label: 'Spend', width: 100, sortable: true },
    { id: 'conversions', label: 'Conv.', width: 80, sortable: true },
    { id: 'cvr', label: 'CVR', width: 80, sortable: true },
    { id: 'cpa', label: 'CPA', width: 80, sortable: true },
    { id: 'roas', label: 'ROAS', width: 80, sortable: true }
  ];

  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);

  const handleFilter = (filter: typeof selectedFilter) => {
    setSelectedFilter(filter);
    setShowFilterDropdown(false);
  };

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortedCreatives = (items: unknown[]) => {
    return [...items].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.field) {
        case 'sales':
          return (a.sales - b.sales) * direction;
        case 'createdAt':
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
        case 'cost':
          return (a.cost - b.cost) * direction;
        case 'recommendedPrice':
          return (a.recommendedPrice - b.recommendedPrice) * direction;
        case 'margin':
          return (
            ((a.recommendedPrice - a.cost) / a.recommendedPrice -
             (b.recommendedPrice - b.cost) / b.recommendedPrice) * direction
          );
        default:
          return 0;
      }
    });
  };

  const filteredCreatives = creatives.filter(creative => {
    const matchesSearch = 
      creative.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      creative.adName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      selectedFilter === 'all' ||
      (selectedFilter === 'assigned' && creative.isAssigned) ||
      (selectedFilter === 'unassigned' && !creative.isAssigned);
    
    return matchesSearch && matchesFilter;
  });

  const sortedCreatives = getSortedCreatives(filteredCreatives);

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-300 dark:text-gray-600" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-gray-900 dark:text-white" />
      : <ArrowDown className="w-4 h-4 text-gray-900 dark:text-white" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Creative Performance</h2>
        <div className="flex items-center space-x-4">
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search creatives..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#4a4a4a] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-gray-200 dark:focus:border-gray-600 text-gray-900 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-[#4a4a4a] rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#333333] overflow-hidden">
        <div className="relative">
          <div className="sticky top-0 z-20 bg-white dark:bg-dark border-b border-gray-200 dark:border-[#333333]">
            <div 
              ref={headerRef}
              className="overflow-x-auto scrollbar-thin"
              style={{ overflow: 'hidden' }}
            >
              <div style={{ width: `${totalWidth}px`, minWidth: '100%' }} className="flex">
                {columns.map((column, index) => (
                  <div
                    key={column.id}
                    className={`flex items-center h-12 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 capitalize tracking-wider whitespace-nowrap ${
                      index === 0 ? 'rounded-tl-xl' : index === columns.length - 1 ? 'rounded-tr-xl' : ''
                    }`}
                    style={{ width: column.width }}
                  >
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.id as SortField)}
                        className="group inline-flex items-center space-x-1"
                      >
                        <span>{column.label}</span>
                        <span className="text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400">
                          {getSortIcon(column.id as SortField)}
                        </span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div 
            ref={tableRef}
            className="overflow-x-auto scrollbar-thin"
            style={{ maxHeight: 'calc(100vh - 400px)' }}
          >
            <div style={{ width: `${totalWidth}px`, minWidth: '100%' }}>
              {sortedCreatives.map((creative, index) => (
                <div
                  key={creative.id}
                  className={`flex border-b border-gray-200 dark:border-[#333333] hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/80 ${
                    index % 2 === 0 ? 'bg-white dark:bg-dark' : 'bg-gray-50/30 dark:bg-[#2a2a2a]/30'
                  }`}
                >
                  {columns.map((column, colIndex) => (
                    <div
                      key={column.id}
                      className={`flex items-center px-4 py-4 text-sm text-gray-900 dark:text-white ${
                        index === sortedCreatives.length - 1 ? (
                          colIndex === 0 ? 'rounded-bl-xl' : 
                          colIndex === columns.length - 1 ? 'rounded-br-xl' : ''
                        ) : ''
                      }`}
                      style={{ width: column.width }}
                    >
                      {column.render ? (
                        column.render(null, creative)
                      ) : column.id === 'platform' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 capitalize">
                          {creative.platform || 'facebook'}
                        </span>
                      ) : column.id === 'performance' ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          creative.performance === 'high' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                          creative.performance === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                          'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        }`}>
                          {creative.performance.charAt(0).toUpperCase() + creative.performance.slice(1)}
                        </span>
                      ) : column.id === 'fatigueScore' ? (
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                creative.fatigueScore < 30 ? 'bg-green-500' :
                                creative.fatigueScore < 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${creative.fatigueScore}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
                            {Math.round(creative.fatigueScore)}
                          </span>
                        </div>
                      ) : column.id === 'adName' ? (
                        <div className="truncate" title={creative.adName}>
                          {creative.adName || '-'}
                        </div>
                      ) : column.id === 'impressions' ? (
                        creative.metrics.impressions.toLocaleString()
                      ) : column.id === 'clicks' ? (
                        creative.metrics.clicks.toLocaleString()
                      ) : column.id === 'ctr' ? (
                        `${creative.metrics.ctr.toFixed(2)}%`
                      ) : column.id === 'cpc' ? (
                        `$${creative.metrics.cpc?.toFixed(2) || '0.00'}`
                      ) : column.id === 'spend' ? (
                        `$${creative.metrics.spend.toFixed(2)}`
                      ) : column.id === 'conversions' ? (
                        <span className={creative.hasRealConversionData ? 'font-semibold text-green-600 dark:text-green-400' : ''}>
                          {creative.metrics.conversions}
                        </span>
                      ) : column.id === 'cvr' ? (
                        `${creative.metrics.cvr?.toFixed(2) || '0.00'}%`
                      ) : column.id === 'cpa' ? (
                        `$${creative.metrics.cpa.toFixed(2)}`
                      ) : column.id === 'roas' ? (
                        <span className={creative.hasRealConversionData ? 'font-semibold' : ''}>
                          {creative.metrics.roas?.toFixed(2) || '0.00'}x
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ))}

              {sortedCreatives.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">No creatives found matching your filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};