import React from 'react';
import { Plus, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Quote } from '@/types/quotes';

interface QuoteFormProps {
  onSubmit: (quote: Quote) => void;
}

export const getPlatformFromUrl = (url: string): Quote['platform'] => {
  if (url.includes('aliexpress.com')) return 'aliexpress';
  if (url.includes('amazon.com')) return 'amazon';
  return 'other';
};

export const QuoteForm: React.FC<QuoteFormProps> = ({ onSubmit }) => {
  const [productUrl, setProductUrl] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productUrl) {
      toast.error('Please enter a product URL');
      return;
    }

    try {
      new URL(productUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    const platform = getPlatformFromUrl(productUrl);
    
    const newQuote: Quote = {
      id: `QT-2024-${String(Date.now()).slice(-3)}`,
      productUrl,
      platform,
      productName: 'Processing...',
      requestDate: new Date().toISOString().split('T')[0],
      status: 'quote_pending'
    };

    onSubmit(newQuote);
    setProductUrl('');
    
    toast.success('Quote request submitted successfully', {
      description: 'Our team will review your request and provide a quote soon.'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="mb-2">
            <label htmlFor="productUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Product URL
            </label>
          </div>
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                id="productUrl"
                placeholder="Paste AliExpress or Amazon product link here"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                className="search-input w-full"
              />
            </div>
            <button
              type="submit"
              className="action-button bg-gray-900 dark:bg-gray-800 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Request Quote
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};