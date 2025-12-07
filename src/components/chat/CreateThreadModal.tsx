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
  customer_first_name?: string;
  customer_last_name?: string;
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
      const currentUser = (await supabase.auth.getUser()).data.user;

      const { data: threadData, error } = await supabase
        .from('chat_threads')
        .insert({
          chat_id: chatId,
          order_id: selectedOrderId,
          shopify_order_id: selectedOrder?.shopify_order_id,
          title: title.trim(),
          description: description.trim() || null,
          created_by_user_id: currentUser?.id,
          created_by_admin: false, // User is creating this
          status: 'open',
        })
        .select('id, tag')
        .single();

      if (error) throw error;

      // Send automated welcome message for the thread
      const welcomeMessage = getThreadWelcomeMessage(threadData.tag, selectedOrder);

      if (welcomeMessage) {
        const { error: messageError } = await supabase.from('messages').insert({
          chat_id: chatId,
          thread_id: threadData.id,
          content: welcomeMessage,
          type: 'text',
          sender: 'team',
          timestamp: new Date().toISOString(),
          metadata: {
            automated: true,
            thread_welcome: true,
            thread_tag: threadData.tag
          }
        });

        if (messageError) {
          console.error('Error creating welcome message:', messageError);
          // Don't fail the thread creation if message fails
        }
      }

      toast.success('Thread created successfully');
      onThreadCreated(threadData.id);
      handleClose();
    } catch (error) {
      console.error('Error creating thread:', error);
      toast.error('Failed to create thread');
    } finally {
      setIsCreating(false);
    }
  };

  const getThreadWelcomeMessage = (tag: string | null, order: Order | undefined): string => {
    const orderNum = order?.order_number || 'your order';

    switch (tag) {
      case 'defective':
        return `Thank you for reaching out about ${orderNum}. I'm here to help resolve this defective item issue.\n\nTo assist you quickly, could you please provide:\n• Photos of the defective item\n• A brief description of the issue\n• Your preferred resolution (replacement or refund)\n\nI'll review your case and get back to you with next steps as soon as possible.`;

      case 'return':
        return `I've received your return request for ${orderNum}.\n\nI'll provide you with return instructions shortly, including:\n• Return shipping address\n• Warehouse Entry Number (WEN) for tracking\n• Any specific packaging requirements\n\nPlease don't ship anything yet - wait for the complete instructions to ensure smooth processing.`;

      case 'replacement':
        return `Thank you for contacting us about a replacement for ${orderNum}.\n\nI'll review your order details and get back to you with:\n• Replacement options available\n• Processing timeline\n• Any additional information needed\n\nI'm here to make this as smooth as possible for you.`;

      case 'damaged':
        return `I'm sorry to hear about the damaged item from ${orderNum}.\n\nTo help resolve this quickly, please provide:\n• Photos showing the damage\n• Photos of the packaging (if available)\n• Brief description of the damage\n\nI'll work with our logistics partner to determine the best solution for you.`;

      case 'shipping':
        return `I see you have a question about shipping for ${orderNum}.\n\nI'm here to help with:\n• Tracking updates\n• Delivery estimates\n• Address changes (if still possible)\n• Any shipping concerns\n\nWhat specific information can I help you with?`;

      default:
        return `Thank you for creating this thread about ${orderNum}.\n\nI'm here to help resolve any issues or answer questions you have. Please share any relevant details, and I'll get back to you with a solution as quickly as possible.`;
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setSelectedOrderId('');
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
                  placeholder="Search order number..."
                  onChange={(e) => {
                    const search = e.target.value.toLowerCase();
                    if (search) {
                      const filtered = allOrders.filter(order =>
                        order.order_number.toLowerCase().includes(search)
                      );
                      setOrders(filtered);
                    } else {
                      setOrders(allOrders); // Show all orders
                    }
                  }}
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
                          {order.order_number}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium">
                            {(order.customer_first_name || order.customer_last_name) ? (
                              [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ')
                            ) : order.customer_email ? (
                              order.customer_email.split('@')[0].charAt(0).toUpperCase() + order.customer_email.split('@')[0].slice(1)
                            ) : (
                              'Guest Customer'
                            )} • {' '}
                          </span>
                          {formatDate(order.ordered_at)}
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
