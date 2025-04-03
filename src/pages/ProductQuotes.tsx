import React, { useState } from 'react';
import { Quote } from '@/types/quotes';
import { QuoteForm } from '@/components/quotes/QuoteForm';
import { QuoteFilters } from '@/components/quotes/QuoteFilters';
import { QuoteTable } from '@/components/quotes/QuoteTable';
import { ShopifyConnectModal } from '@/components/quotes/ShopifyConnectModal';
import { toast } from 'sonner';

const mockQuotes: Quote[] = [
  {
    id: 'QT-2024-001',
    productUrl: 'https://www.aliexpress.com/item/123456789.html',
    platform: 'aliexpress',
    productName: 'Wireless Earbuds Pro Max',
    requestDate: '2024-03-15',
    status: 'accepted',
    variants: [
      { quantity: 2, costPerItem: 35.99, shippingCost: 12.99, totalCost: 84.97 },
      { quantity: 4, costPerItem: 32.99, shippingCost: 15.99, totalCost: 147.95 },
      { quantity: 8, costPerItem: 29.99, shippingCost: 19.99, totalCost: 259.91 }
    ],
    expiresIn: 7
  },
  {
    id: 'QT-2024-002',
    productUrl: 'https://www.amazon.com/dp/B0123456789',
    platform: 'amazon',
    productName: 'Smart Home Security Camera',
    requestDate: '2024-03-14',
    status: 'accepted',
    variants: [
      { quantity: 2, costPerItem: 45.99, shippingCost: 8.99, totalCost: 100.97 },
      { quantity: 4, costPerItem: 42.99, shippingCost: 12.99, totalCost: 184.95 },
      { quantity: 8, costPerItem: 39.99, shippingCost: 15.99, totalCost: 335.91 }
    ],
    shopifyConnected: true,
    shopifyProductId: 'gid://shopify/Product/12345678',
    shopifyStatus: 'synced'
  },
  {
    id: 'QT-2024-003',
    productUrl: 'https://www.aliexpress.com/item/987654321.html',
    platform: 'aliexpress',
    productName: 'LED Gaming Keyboard',
    requestDate: '2024-03-13',
    status: 'quote_pending'
  },
  {
    id: 'QT-2024-004',
    productUrl: 'https://www.amazon.com/dp/B0987654321',
    platform: 'amazon',
    productName: 'Smart Watch Series X Pro',
    requestDate: '2024-03-15',
    status: 'quoted',
    variants: [
      { quantity: 1, costPerItem: 89.99, shippingCost: 5.99, totalCost: 95.98 },
      { quantity: 3, costPerItem: 84.99, shippingCost: 12.99, totalCost: 267.96 },
      { quantity: 5, costPerItem: 79.99, shippingCost: 15.99, totalCost: 415.94 }
    ],
    expiresIn: 5
  },
  {
    id: 'QT-2024-005',
    productUrl: 'https://www.aliexpress.com/item/456789123.html',
    platform: 'aliexpress',
    productName: 'Portable Power Bank 20000mAh',
    requestDate: '2024-03-14',
    status: 'rejected',
    variants: [
      { quantity: 5, costPerItem: 15.99, shippingCost: 8.99, totalCost: 88.94 },
      { quantity: 10, costPerItem: 14.99, shippingCost: 12.99, totalCost: 162.89 },
      { quantity: 20, costPerItem: 13.99, shippingCost: 19.99, totalCost: 299.79 }
    ]
  },
  {
    id: 'QT-2024-006',
    productUrl: 'https://www.amazon.com/dp/B0456789123',
    platform: 'amazon',
    productName: 'Wireless Gaming Mouse',
    requestDate: '2024-03-13',
    status: 'expired',
    variants: [
      { quantity: 3, costPerItem: 25.99, shippingCost: 7.99, totalCost: 85.96 },
      { quantity: 6, costPerItem: 23.99, shippingCost: 11.99, totalCost: 155.93 },
      { quantity: 12, costPerItem: 21.99, shippingCost: 15.99, totalCost: 279.87 }
    ]
  },
  {
    id: 'QT-2024-007',
    productUrl: 'https://www.aliexpress.com/item/789123456.html',
    platform: 'aliexpress',
    productName: 'Mechanical Keyboard Switches (Pack)',
    requestDate: '2024-03-12',
    status: 'accepted',
    variants: [
      { quantity: 50, costPerItem: 0.45, shippingCost: 5.99, totalCost: 28.49 },
      { quantity: 100, costPerItem: 0.40, shippingCost: 8.99, totalCost: 48.99 },
      { quantity: 200, costPerItem: 0.35, shippingCost: 12.99, totalCost: 82.99 }
    ],
    shopifyConnected: true,
    shopifyProductId: 'gid://shopify/Product/87654321',
    shopifyStatus: 'synced'
  },
  {
    id: 'QT-2024-008',
    productUrl: 'https://www.amazon.com/dp/B0789123456',
    platform: 'amazon',
    productName: 'USB-C Docking Station',
    requestDate: '2024-03-11',
    status: 'quoted',
    variants: [
      { quantity: 2, costPerItem: 55.99, shippingCost: 9.99, totalCost: 121.97 },
      { quantity: 4, costPerItem: 52.99, shippingCost: 14.99, totalCost: 226.95 },
      { quantity: 8, costPerItem: 49.99, shippingCost: 19.99, totalCost: 419.91 }
    ],
    expiresIn: 3
  }
];

export default function ProductQuotes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Quote['status'] | 'all'>('all');
  const [quotes, setQuotes] = useState<Quote[]>(mockQuotes);
  const [expandedQuotes, setExpandedQuotes] = useState<string[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showShopifyModal, setShowShopifyModal] = useState(false);

  const handleSubmitQuote = (newQuote: Quote) => {
    setQuotes([newQuote, ...quotes]);
  };

  const toggleQuoteExpansion = (quoteId: string) => {
    setExpandedQuotes(prev => 
      prev.includes(quoteId)
        ? prev.filter(id => id !== quoteId)
        : [...prev, quoteId]
    );
  };

  const handleAcceptQuote = (quote: Quote) => {
    if (quote.status !== 'quoted') return;

    setQuotes(prev => prev.map(q => 
      q.id === quote.id ? { ...q, status: 'accepted' } : q
    ));

    setSelectedQuote(quote);
    setShowShopifyModal(true);
  };

  const handleShopifyConnect = (quoteId: string) => {
    setQuotes(prev => prev.map(q => 
      q.id === quoteId ? {
        ...q,
        shopifyConnected: true,
        shopifyProductId: `gid://shopify/Product/${Math.floor(Math.random() * 1000000)}`,
        shopifyStatus: 'synced'
      } : q
    ));
    
    toast.success('Product successfully synced with Shopify');
    setShowShopifyModal(false);
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.productUrl.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-[1050px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Quotes
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Submit product links to receive competitive quotes
          </p>
        </div>
      </div>

      {/* Quote Form */}
      <QuoteForm onSubmit={handleSubmitQuote} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Quote History</h2>
          <QuoteFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </div>

        {/* Quotes Table */}
        <QuoteTable
          quotes={filteredQuotes}
          expandedQuotes={expandedQuotes}
          onToggleExpand={toggleQuoteExpansion}
          onAcceptQuote={handleAcceptQuote}
          onConnectShopify={(quote) => {
            setSelectedQuote(quote);
            setShowShopifyModal(true);
          }}
        />
      </div>

      {/* Shopify Connect Modal */}
      {showShopifyModal && selectedQuote && (
        <ShopifyConnectModal
          quote={selectedQuote}
          onClose={() => {
            setShowShopifyModal(false);
            setSelectedQuote(null);
          }}
          onConnect={handleShopifyConnect}
        />
      )}
    </div>
  );
}