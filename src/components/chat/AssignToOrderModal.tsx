import React, { useState, useEffect } from 'react';
import { X, Package, Tag as TagIcon, Search, ArrowRight } from 'lucide-react';
import Modal from '@/components/Modal';
import { chatService } from '@/lib/chatService';
import { supabase } from '@/lib/supabase';

interface Order {
  id: string;
  order_number: string;
  total: number;
  created_at: string;
  financial_status?: string;
  fulfillment_status?: string;
  customer_name?: string;
  line_items_count?: number;
}

interface AssignToOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  userId: string;
  onThreadCreated: (threadId: string) => void;
}

const TAG_OPTIONS: Array<{ value: string; label: string; color: string }> = [
  { value: 'return', label: 'Return', color: 'bg-red-500/20 text-red-600 dark:text-red-400' },
  { value: 'replacement', label: 'Replacement', color: 'bg-orange-500/20 text-orange-600 dark:text-orange-400' },
  { value: 'damaged', label: 'Damaged', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
  { value: 'defective', label: 'Defective', color: 'bg-purple-500/20 text-purple-600 dark:text-purple-400' },
  { value: 'inquiry', label: 'Inquiry', color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400' },
  { value: 'other', label: 'Other', color: 'bg-gray-500/20 text-gray-600 dark:text-gray-400' },
];

export const AssignToOrderModal: React.FC<AssignToOrderModalProps> = ({
  isOpen,
  onClose,
  chatId,
  userId,
  onThreadCreated,
}) => {
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [matchingOrders, setMatchingOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (orderNumber.length >= 2) {
      searchOrders(orderNumber);
    } else {
      setMatchingOrders([]);
      setShowDropdown(false);
    }
  }, [orderNumber]);

  const searchOrders = async (searchTerm: string) => {
    setIsSearching(true);
    try {
      // Try to find orders by order_number containing the search term
      // This will match partial numbers like "1001" in "#1001"
      const { data, error } = await supabase
        .from('shopify_orders')
        .select('id, order_number, total, created_at, financial_status, fulfillment_status, customer_name, line_items_count')
        .eq('user_id', userId)
        .ilike('order_number', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Search error:', error);
        throw error;
      }

      console.log('Order search results:', data);
      setMatchingOrders(data || []);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching orders:', error);
      setMatchingOrders([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedOrder) return;

    setIsCreating(true);
    try {
      const threadId = await chatService.createThread(
        chatId,
        selectedOrder.id,
        selectedTag || undefined
      );

      if (threadId) {
        // If it's a return, send auto-message with instructions
        if (selectedTag === 'return') {
          await chatService.sendThreadMessage(
            threadId,
            chatId,
            `**Important Return Instructions:**

Let us know the reason for the return. If the customer changed their mind, there will be a fee. If the reason for the return is our fault, we may cover the cost of the return.

**📋 Return Process:**

We will provide you a "Warehouse Entry Number" that you need to send to your customer first. Your customer will then need to clearly write this number on the outside of the package near the shipping label.

In addition to this, your customer will need to include a note inside the package with their:

• Full name
• Your order number
• Product name(s)
• Quantity (number of boxes, not individual units)

⚠️ **Important:** Returns sent without this information or to the wrong address may be rejected or discarded by the warehouse.

Items sent back to us without first requesting a return will not be accepted.`,
            'text',
            'team',
            {}
          );
        }

        onThreadCreated(threadId);
        handleClose();
      }
    } catch (error) {
      console.error('Error creating thread:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setOrderNumber('');
    setSelectedOrder(null);
    setSelectedTag('');
    setMatchingOrders([]);
    setShowDropdown(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Assign to Order">
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Create a dedicated channel for this order to keep the conversation organized.
        </p>

        {/* Tag Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <TagIcon className="w-4 h-4 inline mr-1" />
            Category (Optional)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TAG_OPTIONS.map(tag => (
              <button
                key={tag.value}
                onClick={() => setSelectedTag(selectedTag === tag.value ? '' : tag.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTag === tag.value
                    ? tag.color
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Order Number Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Search className="w-4 h-4 inline mr-1" />
            Order Number *
          </label>
          <div className="relative">
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Type order number..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#e83653]" />
              </div>
            )}
          </div>

          {/* Dropdown Results */}
          {showDropdown && matchingOrders.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 max-h-64 overflow-y-auto">
              {matchingOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    setOrderNumber(order.order_number);
                    setShowDropdown(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">#{order.order_number}</span>
                    <div className="flex items-center gap-2">
                      {order.financial_status && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                          {order.financial_status}
                        </span>
                      )}
                      {order.fulfillment_status && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          {order.fulfillment_status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {order.customer_name && <span>{order.customer_name} • </span>}
                    {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    {' • '}${order.total.toFixed(2)}
                    {order.line_items_count && ` for ${order.line_items_count} item${order.line_items_count !== 1 ? 's' : ''}`}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showDropdown && matchingOrders.length === 0 && !isSearching && orderNumber.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 text-center text-gray-500 dark:text-gray-400 text-sm z-50">
              No orders found
            </div>
          )}

          {/* Selected Order Display */}
          {selectedOrder && !showDropdown && (
            <div className="mt-2 p-3 bg-gradient-to-r from-red-500/10 to-pink-600/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900 dark:text-white">Selected: #{selectedOrder.order_number}</span>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setOrderNumber('');
                  }}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedOrder || isCreating}
            className="group px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center gap-2"
          >
            <span>{isCreating ? 'Creating...' : 'Create Thread'}</span>
            {!isCreating && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
          </button>
        </div>
      </div>
    </Modal>
  );
};
