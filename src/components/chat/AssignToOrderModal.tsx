import React, { useState, useEffect } from 'react';
import { X, Package, Tag as TagIcon, Search, ArrowRight } from 'lucide-react';
import Modal from '@/components/Modal';
import { chatService } from '@/lib/chatService';
import { supabase } from '@/lib/supabase';
import { toast } from '../../lib/toast';

interface Order {
  id: string;
  order_number: string;
  total_price: number;
  created_at: string;
  customer_email?: string;
  customer_first_name?: string;
  customer_last_name?: string;
  ordered_at?: string;
}

interface AssignToOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  userId: string;
  onThreadCreated: (threadId: string) => void;
  mode?: 'assign' | 'create';
  preSelectedTemplate?: { id: string; name: string } | null;
}

const TAG_OPTIONS: Array<{ value: string; label: string; color: string }> = [
  { value: 'return', label: 'Return', color: 'bg-red-500/20 text-red-600 dark:text-red-400' },
  { value: 'replacement', label: 'Replacement', color: 'bg-orange-500/20 text-orange-600 dark:text-orange-400' },
  { value: 'damaged', label: 'Damaged', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
  { value: 'defective', label: 'Defective', color: 'bg-purple-500/20 text-purple-600 dark:text-purple-400' },
];

export const AssignToOrderModal: React.FC<AssignToOrderModalProps> = ({
  isOpen,
  onClose,
  chatId,
  userId,
  onThreadCreated,
  mode = 'assign',
  preSelectedTemplate = null,
}) => {
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [matchingOrders, setMatchingOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [existingThread, setExistingThread] = useState<{ id: string; tag: string | null } | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (selectedOrder) {
      setMatchingOrders([]);
      return;
    }

    if (orderNumber.length < 2) {
      setMatchingOrders([]);
      return;
    }

    const timer = setTimeout(() => {
      searchOrders(orderNumber);
    }, 300);

    return () => clearTimeout(timer);
  }, [orderNumber, selectedOrder]);

  const searchOrders = async (searchTerm: string) => {
    setIsSearching(true);
    try {
      // Clean up search term - remove # if present, trim whitespace
      const cleanTerm = searchTerm.replace(/^#/, '').trim();

      console.log('🔍 Searching for orders with term:', cleanTerm);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user ID:', user?.id);

      // Don't filter by user_id - let RLS handle it based on auth.uid()
      const { data, error } = await supabase
        .from('shopify_orders')
        .select('id, order_number, total_price, created_at, customer_email, customer_first_name, customer_last_name, ordered_at, user_id')
        .ilike('order_number', `%${cleanTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Search error:', error);
        throw error;
      }

      console.log('✅ Order search results:', data);
      setMatchingOrders(data || []);
    } catch (error) {
      console.error('❌ Error searching orders:', error);
      setMatchingOrders([]);
    } finally {
      setIsSearching(false);
    }
  };

  const checkExistingThread = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('id, tag')
        .eq('chat_id', chatId)
        .eq('order_id', orderId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingThread(data);
        setShowWarning(true);
      } else {
        setExistingThread(null);
        setShowWarning(false);
      }
    } catch (error) {
      console.error('Error checking existing thread:', error);
    }
  };

  const handleOrderSelect = async (order: Order) => {
    setSelectedOrder(order);
    setOrderNumber(order.order_number);
    await checkExistingThread(order.id);
  };

  const handleCreate = async () => {
    if (!selectedTag) {
      toast.error('Please select a category');
      return;
    }

    if (!selectedOrder) {
      toast.error('Please select an order');
      return;
    }

    setIsCreating(true);
    try {
      let threadId: string;

      // If thread exists with same tag, just open it
      const normalizedExistingTag = existingThread?.tag || '';
      const normalizedSelectedTag = selectedTag || '';

      if (existingThread && normalizedExistingTag === normalizedSelectedTag) {
        threadId = existingThread.id;
        toast.success('Opening existing thread');
        setIsCreating(false);
        onThreadCreated(threadId);
        handleClose();
        return;
      }

      // If thread exists with different tag, update it
      if (existingThread) {
        console.log('🔄 Updating existing thread tag:', existingThread.id);

        const { error } = await supabase
          .from('chat_threads')
          .update({ tag: selectedTag || null })
          .eq('id', existingThread.id);

        if (error) throw error;

        threadId = existingThread.id;
        toast.success('Thread tag updated successfully');
      } else {
        console.log('🔧 Creating thread for order:', selectedOrder.order_number);
        console.log('📊 Thread params:', { chatId, orderId: selectedOrder.id, tag: selectedTag });

        threadId = await chatService.createThread(
          chatId,
          selectedOrder.id,
          selectedTag || undefined
        );

        console.log('✅ Thread created with ID:', threadId);

        if (!threadId) {
          throw new Error('Failed to create thread - no thread ID returned');
        }
      }

      // If it's a return and this is a NEW thread, send auto-message with instructions
      if (selectedTag === 'return' && !existingThread) {
        console.log('📤 Sending auto-message for return category...');
        try {
          const message = await chatService.sendThreadMessage(
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
            { automated: 'true' }
          );

          if (message) {
            console.log('✅ Auto-message sent successfully:', message.id);
          } else {
            console.warn('⚠️ Auto-message failed to send (no message returned)');
          }
        } catch (msgError) {
          console.error('❌ Error sending auto-message:', msgError);
          // Don't fail the whole operation if just the message fails
        }
      }

      if (!existingThread) {
        if (preSelectedTemplate) {
          toast.success('Thread created! Opening template...');
        } else {
          toast.success('Thread created successfully');
        }
      }
      onThreadCreated(threadId);
      handleClose();
    } catch (error) {
      console.error('❌ Error creating thread:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create thread. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setOrderNumber('');
    setSelectedOrder(null);
    setSelectedTag('');
    setMatchingOrders([]);
    setExistingThread(null);
    setShowWarning(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={mode === 'create' ? 'Create New Thread' : 'Assign to Order'}>
      <div className="p-6 space-y-4">
        {preSelectedTemplate && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-900 dark:text-red-100">
              <span className="font-medium">Template selected:</span> {preSelectedTemplate.name}
            </p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              This template will be generated for the selected order
            </p>
          </div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {mode === 'create'
            ? 'Create a dedicated thread for an order to keep conversations organized.'
            : preSelectedTemplate
              ? 'Select an order to generate the email template with proper customer details.'
              : 'Create a dedicated channel for this order to keep the conversation organized.'}
        </p>

        {/* Tag Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <TagIcon className="w-4 h-4 inline mr-1" />
            Category
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TAG_OPTIONS.map(tag => (
              <button
                key={tag.value}
                onClick={() => setSelectedTag(selectedTag === tag.value ? '' : tag.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTag === tag.value
                    ? tag.color
                    : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#4a4a4a]'
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
              onFocus={() => setInputFocused(true)}
              onBlur={() => setTimeout(() => setInputFocused(false), 200)}
              placeholder="Type order number..."
              disabled={!!selectedOrder}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#4a4a4a] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:focus:ring-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#e83653]" />
              </div>
            )}
          </div>

          {/* Dropdown Results */}
          {!selectedOrder && inputFocused && matchingOrders.length > 0 && orderNumber.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark border border-gray-200 dark:border-[#333333] rounded-lg shadow-xl overflow-hidden z-50 max-h-64 overflow-y-auto">
              {matchingOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => handleOrderSelect(order)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors border-b border-gray-100 dark:border-[#333333] last:border-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">{order.order_number}</span>
                    <span className="text-sm font-medium text-[#e83653]">
                      ${Number(order.total_price).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">
                      {(order.customer_first_name || order.customer_last_name) ? (
                        [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ')
                      ) : order.customer_email ? (
                        order.customer_email.split('@')[0].charAt(0).toUpperCase() + order.customer_email.split('@')[0].slice(1)
                      ) : (
                        'Guest Customer'
                      )} • {' '}
                    </span>
                    {new Date(order.ordered_at || order.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!selectedOrder && inputFocused && matchingOrders.length === 0 && !isSearching && orderNumber.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark border border-gray-200 dark:border-[#333333] rounded-lg shadow-xl p-4 text-center text-gray-500 dark:text-gray-400 text-sm z-50">
              No orders found
            </div>
          )}

          {/* Selected Order Display */}
          {selectedOrder && (
            <div className="mt-2 p-3 bg-gradient-to-r from-red-500/10 to-pink-600/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900 dark:text-white">Selected: {selectedOrder.order_number}</span>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setOrderNumber('');
                    setExistingThread(null);
                    setShowWarning(false);
                  }}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Warning for existing thread */}
          {showWarning && existingThread && (
            <>
              {(existingThread.tag || '') === (selectedTag || '') ? (
                <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                    A thread for this order already exists
                    {existingThread.tag && (
                      <span className="ml-1">with tag: <span className="font-bold">{existingThread.tag}</span></span>
                    )}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                    Click "Open Thread" to navigate to the existing conversation.
                  </p>
                </div>
              ) : (
                <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                    A thread for this order already exists
                    {existingThread.tag && (
                      <span className="ml-1">
                        with tag: <span className="font-bold">{existingThread.tag}</span>
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                    Continuing will update the tag/category instead of creating a new thread.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-6 border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#2a2a2a]/50 px-6 py-4 -mx-6 -mb-6">
          <button
            onClick={handleClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedOrder || !selectedTag || isCreating}
            className="group btn btn-primary flex items-center gap-2"
          >
            <span>
              {isCreating ? (
                existingThread && (existingThread.tag || '') === (selectedTag || '') ? 'Opening...' :
                existingThread ? 'Updating...' : 'Creating...'
              ) : (
                existingThread && (existingThread.tag || '') === (selectedTag || '') ? 'Open Thread' :
                existingThread ? 'Update Tag' : 'Create Thread'
              )}
            </span>
            {!isCreating && <ArrowRight className="w-4 h-4 btn-icon btn-icon-arrow" />}
          </button>
        </div>
      </div>
    </Modal>
  );
};
