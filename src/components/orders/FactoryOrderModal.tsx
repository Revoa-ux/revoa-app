import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Package, Minus, Plus, AlertCircle } from 'lucide-react';
import Modal from '../Modal';
import { Invoice } from '../../lib/invoiceService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../lib/toast';

interface FactoryOrderModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}

interface LineItem {
  id: string;
  sku: string;
  product_name: string;
  quantity: number;
  original_quantity: number;
  unit_cost: number;
  total_cost: number;
}

export default function FactoryOrderModal({
  invoice,
  onClose,
  onSuccess
}: FactoryOrderModalProps) {
  const { user } = useAuth();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  const totalAmount = invoice.total_amount || invoice.amount;
  const alreadyOrdered = invoice.factory_order_amount || 0;
  const availableFunds = totalAmount - alreadyOrdered;

  useEffect(() => {
    if (invoice.line_items && invoice.line_items.length > 0) {
      const items = invoice.line_items.map((item: any, index: number) => ({
        id: `item_${index}`,
        sku: item.sku || item.product_sku || `SKU-${index + 1}`,
        product_name: item.product_name || item.description || 'Unknown Product',
        quantity: item.quantity || 1,
        original_quantity: item.quantity || 1,
        unit_cost: item.cost_per_item || item.unit_price || 0,
        total_cost: (item.quantity || 1) * (item.cost_per_item || item.unit_price || 0)
      }));
      setLineItems(items);
    }
  }, [invoice]);

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    setLineItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: newQuantity,
            total_cost: newQuantity * item.unit_cost
          };
        }
        return item;
      })
    );
  };

  const orderTotal = lineItems.reduce((sum, item) => sum + item.total_cost, 0);
  const isOverBudget = orderTotal > availableFunds;
  const canSubmit = !isSubmitting;

  const handleSubmit = async () => {
    if (!user?.id || isSubmitting) return;

    try {
      setIsSubmitting(true);

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          factory_order_amount: totalAmount,
          factory_order_placed: true
        })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      if (invoice.shopify_order_ids && invoice.shopify_order_ids.length > 0) {
        const { error: ordersUpdateError } = await supabase
          .from('shopify_orders')
          .update({
            factory_order_confirmed: true,
            factory_order_confirmed_at: new Date().toISOString()
          })
          .in('shopify_order_id', invoice.shopify_order_ids);

        if (ordersUpdateError) {
          console.error('Error updating shopify orders:', ordersUpdateError);
        }
      }

      toast.success('Factory order confirmed');
      onSuccess();
    } catch (error) {
      console.error('Error confirming factory order:', error);
      toast.error('Failed to confirm factory order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const merchantName = invoice.user_profile?.company || invoice.user_profile?.email || 'Unknown';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Confirm Factory Order"
      maxWidth="max-w-7xl"
      noPadding
    >
      <div className="flex flex-col h-full">
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="p-4 bg-gray-50 dark:bg-[#3a3a3a]/50/50 rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {merchantName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Invoice: {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Available Funds</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  ${availableFunds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {alreadyOrdered > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    (${alreadyOrdered.toFixed(2)} already ordered)
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Order Items
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Adjust quantities as needed. You can order more or less than the invoice amount.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-[#3a3a3a] rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-dark">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Quantity</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Unit Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark divide-y divide-gray-200 dark:divide-gray-700">
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                          {item.sku}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {item.product_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 0}
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-center text-sm bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent"
                          />
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {item.quantity !== item.original_quantity && (
                          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
                            (originally {item.original_quantity})
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          ${item.unit_cost.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          ${item.total_cost.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-[#3a3a3a]/50/30 rounded-lg border border-gray-200 dark:border-[#3a3a3a]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Order Total</p>
                <p className={`text-2xl font-bold ${
                  isOverBudget
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  ${orderTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Remaining After Order</p>
                <p className={`text-lg font-semibold ${
                  isOverBudget
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  ${(availableFunds - orderTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {isOverBudget && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  Order total exceeds available funds. Reduce quantities or request a top-up from the merchant.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for this factory order..."
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-4 sm:px-6 py-4 flex-shrink-0">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-secondary flex-1"
            >
              <ArrowLeft className="btn-icon btn-icon-back" />
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="btn btn-primary flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Confirming...</span>
                </>
              ) : (
                <>
                  <span>Confirm Factory Order Placed</span>
                  <ArrowRight className="btn-icon btn-icon-arrow" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
