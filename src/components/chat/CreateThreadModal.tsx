import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import { supabase } from '@/lib/supabase';

interface Order {
  id: string;
  shopify_order_id: string;
  order_number: string;
  total_price: string;
  ordered_at: string;
  currency: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
}

interface CreateThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  userId: string;
  onThreadCreated: (threadId: string) => void;
}

export function CreateThreadModal({
  isOpen,
  onClose,
  chatId,
  userId,
  onThreadCreated,
}: CreateThreadModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && userId) {
      loadOrders();
    }
  }, [isOpen, userId]);

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('shopify_orders')
        .select('id, shopify_order_id, order_number, total_price, ordered_at, currency, customer_first_name, customer_last_name')
        .eq('user_id', userId)
        .order('ordered_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setOrders(data || []);
      setAllOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = allOrders.filter(order => {
        const customerName = [order.customer_first_name, order.customer_last_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const query = searchQuery.toLowerCase();
        return (
          order.order_number.toLowerCase().includes(query) ||
          customerName.includes(query)
        );
      });
      setOrders(filtered);
    } else {
      setOrders(allOrders);
    }
  }, [searchQuery, allOrders]);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title for this thread');
      return;
    }

    if (!selectedOrderId) {
      toast.error('Please select an order for this thread');
      return;
    }

    setIsCreating(true);
    try {
      const selectedOrder = orders.find(o => o.id === selectedOrderId);
      const { data: currentUser } = await supabase.auth.getUser();

      const threadTags = selectedCategory ? [selectedCategory] : [];

      const { data, error } = await supabase
        .from('chat_threads')
        .insert({
          chat_id: chatId,
          order_id: selectedOrderId,
          shopify_order_id: selectedOrder?.shopify_order_id,
          title: title.trim(),
          description: description.trim() || null,
          tags: threadTags,
          created_by_user_id: currentUser?.user?.id,
          created_by_admin: true,
          status: 'open',
        })
        .select('id')
        .single();

      if (error) throw error;

      // Send auto-message if category was selected
      if (selectedCategory) {
        const { sendAutoMessageForThread } = await import('@/lib/threadAutoMessageService');
        await sendAutoMessageForThread(
          data.id,
          chatId,
          [selectedCategory],
          {
            order_number: selectedOrder?.order_number,
          }
        );
      }

      toast.success('Thread created successfully');
      onThreadCreated(data.id);
      handleClose();
    } catch (error) {
      console.error('Error creating thread:', error);
      toast.error('Failed to create thread');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setSelectedOrderId('');
    setSelectedCategory('');
    setSearchQuery('');
    onClose();
  };

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Issue Thread">
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">Order-Specific Issue Tracking</p>
              <p className="text-blue-700 dark:text-blue-300">
                Create a dedicated thread to track defective items, shipping issues, or other order-specific problems. Keep conversations organized and easy to reference.
              </p>
            </div>
          </div>
        </div>

        {/* Thread Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Issue Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Defective product received, Shipping delay, etc."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 dark:bg-gray-800 dark:text-white"
            maxLength={100}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {title.length}/100 characters
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide additional details about the issue..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 dark:bg-gray-800 dark:text-white resize-none"
            maxLength={500}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {description.length}/500 characters
          </p>
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Category (Optional) <span className="text-gray-500 font-normal">- Will send auto-message</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'return', label: 'Return', color: 'red' },
              { value: 'replacement', label: 'Replacement', color: 'orange' },
              { value: 'damaged', label: 'Damaged', color: 'yellow' },
              { value: 'defective', label: 'Defective', color: 'purple' },
              { value: 'inquiry', label: 'Inquiry', color: 'blue' },
              { value: '', label: 'Other', color: 'gray' },
            ].map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === category.value
                    ? category.color === 'red' ? 'bg-red-600 text-white' :
                      category.color === 'orange' ? 'bg-orange-600 text-white' :
                      category.color === 'yellow' ? 'bg-yellow-600 text-white' :
                      category.color === 'purple' ? 'bg-purple-600 text-white' :
                      category.color === 'blue' ? 'bg-blue-600 text-white' :
                      'bg-gray-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Order Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Related Order *
          </label>
          {isLoadingOrders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : allOrders.length === 0 ? (
            <div className="text-center py-8 border border-gray-200 dark:border-gray-700 rounded-lg">
              <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No orders found for this user</p>
            </div>
          ) : (
            <>
              {/* Search Input */}
              <div className="mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search order number or customer name..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 dark:bg-gray-800 dark:text-white text-sm"
                />
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-8 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No matching orders found</p>
                </div>
              ) : (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-64 overflow-y-auto">
                  {orders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
                      selectedOrderId === order.id
                        ? 'bg-pink-50 dark:bg-pink-900/20 border-l-4 border-l-pink-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Package className={`w-5 h-5 ${
                        selectedOrderId === order.id
                          ? 'text-pink-600 dark:text-pink-400'
                          : 'text-gray-400'
                      }`} />
                      <div className="text-left">
                        <p className={`font-medium ${
                          selectedOrderId === order.id
                            ? 'text-pink-900 dark:text-pink-100'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          #{order.order_number}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {[order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ') || 'Customer'} • {formatDate(order.ordered_at)}
                        </p>
                      </div>
                    </div>
                    <span className={`font-medium ${
                      selectedOrderId === order.id
                        ? 'text-pink-900 dark:text-pink-100'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}>
                      {formatCurrency(order.total_price, order.currency)}
                    </span>
                  </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || !selectedOrderId || isCreating}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Thread'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
