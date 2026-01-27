import React from 'react';
import { Clock, CheckCircle2, X, AlertCircle, Check, CheckCheck, RefreshCw, Ban } from 'lucide-react';
import { Quote } from '@/types/quotes';

export const getStatusIcon = (status: Quote['status']) => {
  switch (status) {
    case 'quote_pending':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case 'quoted':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'rejected':
      return <X className="w-4 h-4 text-red-500" />;
    case 'expired':
      return <AlertCircle className="w-4 h-4 text-gray-500" />;
    case 'accepted':
      return <Check className="w-4 h-4 text-blue-500" />;
    case 'synced_with_shopify':
      return <CheckCheck className="w-4 h-4 text-purple-500" />;
    case 'pending_reacceptance':
      return <RefreshCw className="w-4 h-4 text-amber-500" />;
    case 'cancelled':
      return <Ban className="w-4 h-4 text-gray-500" />;
  }
};

export const getStatusText = (status: Quote['status']) => {
  switch (status) {
    case 'quote_pending':
      return 'Pending';
    case 'quoted':
      return 'Quoted';
    case 'rejected':
      return 'Rejected';
    case 'expired':
      return 'Expired';
    case 'accepted':
      return 'Accepted';
    case 'synced_with_shopify':
      return 'Synced';
    case 'pending_reacceptance':
      return 'Review Required';
    case 'cancelled':
      return 'Cancelled';
  }
};

export const getStatusClass = (status: Quote['status']) => {
  switch (status) {
    case 'quote_pending':
      return 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/30';
    case 'quoted':
      return 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30';
    case 'rejected':
      return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30';
    case 'expired':
      return 'bg-gray-50 text-gray-700 border-gray-100 dark:bg-dark/20 dark:text-gray-400 dark:border-[#1f1f1f]/30';
    case 'accepted':
      return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30';
    case 'synced_with_shopify':
      return 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/30';
    case 'pending_reacceptance':
      return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30';
    case 'cancelled':
      return 'bg-gray-50 text-gray-700 border-gray-100 dark:bg-dark/20 dark:text-gray-400 dark:border-[#1f1f1f]/30';
  }
};

interface QuoteStatusProps {
  status: Quote['status'];
  expiresIn?: number;
}

export const QuoteStatus: React.FC<QuoteStatusProps> = ({ status, expiresIn }) => {
  return (
    <div className="flex items-center">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs whitespace-nowrap ${getStatusClass(status)}`}>
        {getStatusIcon(status)}
        <span className="ml-1.5">{getStatusText(status)}</span>
      </span>
    </div>
  );
};