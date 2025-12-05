import React, { useState, useEffect } from 'react';
import { X, Package, Tag as TagIcon } from 'lucide-react';
import Modal from '@/components/Modal';
import { chatService } from '@/lib/chatService';

interface Order {
  id: string;
  order_number: string;
  total: number;
  created_at: string;
}

interface AssignToOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  userId: string;
  onThreadCreated: (threadId: string) => void;
}

const TAG_OPTIONS: Array<{ value: string; label: string; color: string }> = [
  { value: 'return', label: 'Return', color: 'bg-gradient-to-r from-red-500 to-pink-600' },
  { value: 'replacement', label: 'Replacement', color: 'bg-gradient-to-r from-orange-500 to-red-500' },
  { value: 'damaged', label: 'Damaged', color: 'bg-gradient-to-r from-yellow-500 to-orange-500' },
  { value: 'defective', label: 'Defective', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { value: 'inquiry', label: 'Inquiry', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
  { value: 'other', label: 'Other', color: 'bg-gradient-to-r from-gray-500 to-gray-600' },
];

export const AssignToOrderModal: React.FC<AssignToOrderModalProps> = ({
  isOpen,
  onClose,
  chatId,
  userId,
  onThreadCreated,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadOrders();
    }
  }, [isOpen, userId]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const userOrders = await chatService.getUserOrders(userId);
      setOrders(userOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedOrderId) return;

    setIsCreating(true);
    try {
      const threadId = await chatService.createThread(
        chatId,
        selectedOrderId,
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
    setSelectedOrderId('');
    setSelectedTag('');
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
                    ? `${tag.color} text-white shadow-lg`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Order Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Package className="w-4 h-4 inline mr-1" />
            Select Order *
          </label>
          {isLoading ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#e83653]" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No orders found
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
              {orders.map(order => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedOrderId === order.id
                      ? 'bg-[#e83653] text-white shadow-md'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      <span className="font-medium">#{order.order_number}</span>
                    </div>
                    <span className="text-sm">${order.total.toFixed(2)}</span>
                  </div>
                  <div className={`text-xs mt-1 ${
                    selectedOrderId === order.id ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {new Date(order.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
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
            disabled={!selectedOrderId || isCreating}
            className="px-4 py-2 text-sm font-medium text-white bg-[#e83653] hover:bg-[#d63043] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Thread'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
