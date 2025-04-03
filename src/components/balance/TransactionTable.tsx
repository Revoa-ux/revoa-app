import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, CreditCard, Building2, Banknote } from 'lucide-react';
import { Transaction, Column } from '@/types/tables';

interface TransactionTableProps {
  data: Transaction[];
  loading?: boolean;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ data, loading }) => {
  const [sortConfig, setSortConfig] = useState<{
    field: keyof Transaction | null;
    direction: 'asc' | 'desc';
  }>({
    field: null,
    direction: 'asc'
  });

  const columns: Column<Transaction>[] = [
    { 
      id: 'date',
      label: 'Date',
      width: 120,
      minWidth: 100,
      sortable: true
    },
    {
      id: 'type',
      label: 'Type',
      width: 150,
      minWidth: 120,
      sortable: true,
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'payment'
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
            : value === 'refund'
            ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            : value === 'adjustment'
            ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
            : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
        }`}>
          {value === 'top_up' ? 'Top Up' : value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      id: 'amount',
      label: 'Amount',
      width: 150,
      minWidth: 120,
      sortable: true,
      render: (value, transaction) => (
        <span className={transaction.type === 'refund' ? 'text-red-600 dark:text-red-400' : ''}>
          ${value.toLocaleString()}
        </span>
      )
    },
    {
      id: 'payment_method',
      label: 'Payment Method',
      width: 180,
      minWidth: 150,
      sortable: true,
      render: (value) => (
        <div className="flex items-center">
          {value === 'card' ? (
            <CreditCard className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
          ) : value === 'bank_transfer' ? (
            <Building2 className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
          ) : (
            <Banknote className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
          )}
          {value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </div>
      )
    },
    {
      id: 'status',
      label: 'Status',
      width: 120,
      minWidth: 100,
      sortable: true,
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'completed'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            : value === 'pending'
            ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      id: 'reference',
      label: 'Reference',
      width: 150,
      minWidth: 120,
      sortable: true
    }
  ];

  const handleSort = (field: keyof Transaction) => {
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
        case 'amount':
          return (a.amount - b.amount) * direction;
        default:
          return String(a[sortConfig.field]).localeCompare(String(b[sortConfig.field])) * direction;
      }
    });
  };

  const getSortIcon = (columnId: keyof Transaction) => {
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
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
              {columns.map((column, index) => (
                <th
                  key={column.id}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 capitalize tracking-wider whitespace-nowrap ${
                    index === 0 ? 'rounded-tl-xl' : index === columns.length - 1 ? 'rounded-tr-xl' : ''
                  }`}
                  style={{ width: column.width }}
                >
                  {column.sortable ? (
                    <button
                      className="group inline-flex items-center space-x-1"
                      onClick={() => handleSort(column.id)}
                    >
                      <span>{column.label}</span>
                      <span className="text-gray-400 group-hover:text-gray-500">
                        {getSortIcon(column.id)}
                      </span>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedData.map((transaction, rowIndex) => (
              <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {columns.map((column, colIndex) => (
                  <td
                    key={column.id}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white ${
                      rowIndex === sortedData.length - 1 ? (
                        colIndex === 0 ? 'rounded-bl-xl' : 
                        colIndex === columns.length - 1 ? 'rounded-br-xl' : ''
                      ) : ''
                    }`}
                    style={{ width: column.width }}
                  >
                    {column.render
                      ? column.render(transaction[column.id], transaction)
                      : transaction[column.id]}
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