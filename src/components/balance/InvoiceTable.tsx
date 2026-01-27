import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Building2 } from 'lucide-react';
import { Invoice, Column } from '@/types/tables';
import { WisePaymentModal } from './WisePaymentModal';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
};

interface InvoiceTableProps {
  data: Invoice[];
  onPaymentConfirmed?: () => void;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ data, onPaymentConfirmed }) => {
  const [sortConfig, setSortConfig] = useState<{
    field: keyof Invoice | null;
    direction: 'asc' | 'desc';
  }>({
    field: null,
    direction: 'asc'
  });

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const columns: Column<Invoice>[] = [
    {
      id: 'date',
      label: 'Date',
      width: 100,
      minWidth: 90,
      sortable: true,
      render: (value) => formatDate(value)
    },
    {
      id: 'invoice_type',
      label: 'Type',
      width: 130,
      minWidth: 110,
      sortable: true,
      render: (value) => {
        const isPurchaseOrder = value === 'purchase_order';
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs ${
            isPurchaseOrder
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
              : 'bg-gray-50 text-gray-600 dark:bg-[#3a3a3a] dark:text-gray-300'
          }`}>
            {isPurchaseOrder ? 'Purchase Order' : 'Shopify Order'}
          </span>
        );
      }
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
          className="text-gray-900 dark:text-white underline hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
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
      render: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    {
      id: 'shipping_cost',
      label: 'Shipping Cost',
      width: 150,
      minWidth: 120,
      sortable: true,
      render: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    {
      id: 'total_cost',
      label: 'Total Cost',
      width: 150,
      minWidth: 120,
      sortable: true,
      render: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    {
      id: 'status',
      label: 'Status',
      width: 120,
      minWidth: 100,
      sortable: true,
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
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
        case 'invoice_type':
          const aType = a.invoice_type || 'auto_generated';
          const bType = b.invoice_type || 'auto_generated';
          return aType.localeCompare(bType) * direction;
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

  const handlePayClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentConfirmed = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    onPaymentConfirmed?.();
  };

  const sortedData = getSortedData();

  const hasUnpaidInvoices = data.some(inv => inv.status === 'unpaid' && inv.wise_pay_link);

  return (
    <>
      <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-[#3a3a3a]">
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.id}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 capitalize tracking-wider whitespace-nowrap ${
                      index === 0 ? 'rounded-tl-xl' : ''
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
                {hasUnpaidInvoices && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 capitalize tracking-wider whitespace-nowrap rounded-tr-xl">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark divide-y divide-gray-200 dark:divide-[#3a3a3a]">
              {sortedData.map((invoice, rowIndex) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-[#3a3a3a]">
                  {columns.map((column, colIndex) => (
                    <td
                      key={column.id}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white ${
                        rowIndex === sortedData.length - 1 && colIndex === 0 ? 'rounded-bl-xl' : ''
                      }`}
                    >
                      {column.render
                        ? column.render(invoice[column.id], invoice)
                        : invoice[column.id]}
                    </td>
                  ))}
                  {hasUnpaidInvoices && (
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      rowIndex === sortedData.length - 1 ? 'rounded-br-xl' : ''
                    }`}>
                      {invoice.status === 'unpaid' && invoice.wise_pay_link ? (
                        <button
                          onClick={() => handlePayClick(invoice)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#3a3a3a] hover:bg-gray-200 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          Pay via Wise
                        </button>
                      ) : invoice.status === 'pending' ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Awaiting verification
                        </span>
                      ) : null}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPaymentModal && selectedInvoice && selectedInvoice.wise_pay_link && (
        <WisePaymentModal
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
          invoiceId={selectedInvoice.id}
          invoiceNumber={selectedInvoice.invoice_number}
          amount={selectedInvoice.total_cost}
          wisePayLink={selectedInvoice.wise_pay_link}
          onPaymentConfirmed={handlePaymentConfirmed}
        />
      )}
    </>
  );
};
