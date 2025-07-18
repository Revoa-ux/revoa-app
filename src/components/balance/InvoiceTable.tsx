import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, FileText } from 'lucide-react';
import { Invoice, Column } from '@/types/tables';

interface InvoiceTableProps {
  data: Invoice[];
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ data }) => {
  const [sortConfig, setSortConfig] = useState<{
    field: keyof Invoice | null;
    direction: 'asc' | 'desc';
  }>({
    field: null,
    direction: 'asc'
  });

  const columns: Column<Invoice>[] = [
    { 
      id: 'date',
      label: 'Date',
      width: 120,
      minWidth: 100,
      sortable: true
    },
    {
      id: 'invoice_number',
      label: 'Invoice',
      width: 150,
      minWidth: 120,
      sortable: true,
      render: (value, invoice) => (
        <a
          href={invoice.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          <FileText className="w-4 h-4 mr-1.5" />
          {value}
        </a>
      )
    },
    {
      id: 'product_cost',
      label: 'Product Cost',
      width: 150,
      minWidth: 120,
      sortable: true,
      render: (value) => `$${value.toLocaleString()}`
    },
    {
      id: 'shipping_cost',
      label: 'Shipping Cost',
      width: 150,
      minWidth: 120,
      sortable: true,
      render: (value) => `$${value.toLocaleString()}`
    },
    {
      id: 'total_cost',
      label: 'Total Cost',
      width: 150,
      minWidth: 120,
      sortable: true,
      render: (value) => `$${value.toLocaleString()}`
    },
    {
      id: 'status',
      label: 'Status',
      width: 120,
      minWidth: 100,
      sortable: true,
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'paid'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            : value === 'pending'
            ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    }
  ];

  const handleSort = (field: keyof Invoice) => {
    setSortConfig(prevConfig => ({
      field,
      direction: prevConfig.field === field && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortedData = () => {
    if (!sortConfig.field) return data;

    return [...data].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.field) {
        case 'date':
          return (new Date(a.date).getTime() - new Date(b.date).getTime()) * direction;
        case 'product_cost':
        case 'shipping_cost':
        case 'total_cost':
          return (a[sortConfig.field] - b[sortConfig.field]) * direction;
        default:
          return String(a[sortConfig.field]).localeCompare(String(b[sortConfig.field])) * direction;
      }
    });
  };

  const getSortIcon = (columnId: keyof Invoice) => {
    if (sortConfig.field !== columnId) {
      return <ArrowUpDown className="w-4 h-4 text-gray-300 dark:text-gray-600" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-gray-900 dark:text-white" />
      : <ArrowDown className="w-4 h-4 text-gray-900 dark:text-white" />;
  };

  const sortedData = getSortedData();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.id}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 capitalize tracking-wider whitespace-nowrap ${
                    index === 0 ? 'rounded-tl-xl' : index === columns.length - 1 ? 'rounded-tr-xl' : ''
                  }`}
                  style={{ width: column.width }}
                >
                  <button
                    className={`flex items-center space-x-2 ${
                      column.sortable ? 'cursor-pointer hover:text-gray-900 dark:hover:text-white' : ''
                    }`}
                    onClick={() => column.sortable && handleSort(column.id)}
                    disabled={!column.sortable}
                  >
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="transition-colors">
                        {getSortIcon(column.id)}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedData.map((invoice, rowIndex) => (
              <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {columns.map((column, colIndex) => (
                  <td
                    key={column.id}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white ${
                      rowIndex === sortedData.length - 1 ? (
                        colIndex === 0 ? 'rounded-bl-xl' : 
                        colIndex === columns.length - 1 ? 'rounded-br-xl' : ''
                      ) : ''
                    }`}
                  >
                    {column.render
                      ? column.render(invoice[column.id], invoice)
                      : invoice[column.id]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};