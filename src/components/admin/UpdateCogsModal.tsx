import React, { useState } from 'react';
import { DollarSign, AlertCircle, Loader2, X } from 'lucide-react';
import Modal from '../Modal';
import { toast } from '../../lib/toast';
import { createCogsUpdate } from '@/lib/cogsUpdateService';

interface UpdateCogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    supplier_price: number;
    created_by?: string;
  };
  variant?: {
    id: string;
    name: string;
    item_cost: number;
  };
  onSuccess?: () => void;
}

export default function UpdateCogsModal({
  isOpen,
  onClose,
  product,
  variant,
  onSuccess,
}: UpdateCogsModalProps) {
  const currentCogs = variant ? variant.item_cost : product.supplier_price;
  const [newCogs, setNewCogs] = useState<string>(currentCogs.toString());
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product.created_by) {
      toast.error('Cannot update COGS: Product has no owner');
      return;
    }

    const newCogsValue = parseFloat(newCogs);

    if (isNaN(newCogsValue) || newCogsValue < 0) {
      toast.error('Please enter a valid cost');
      return;
    }

    if (newCogsValue === currentCogs) {
      toast.error('New cost must be different from current cost');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for the cost change');
      return;
    }

    setIsSubmitting(true);

    try {
      await createCogsUpdate({
        productId: product.id,
        variantId: variant?.id,
        oldCogs: currentCogs,
        newCogs: newCogsValue,
        affectedUserId: product.created_by,
        reasonForChange: reason,
        adminNotes: adminNotes || undefined,
        expiresInDays: parseInt(expiresInDays) || 30,
      });

      toast.success('COGS update sent to user for review');
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      console.error('Error creating COGS update:', error);
      toast.error(error.message || 'Failed to create COGS update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewCogs(currentCogs.toString());
    setReason('');
    setAdminNotes('');
    setExpiresInDays('30');
    onClose();
  };

  const costDifference = parseFloat(newCogs) - currentCogs;
  const percentageChange = currentCogs > 0 ? (costDifference / currentCogs) * 100 : 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Update Product Cost (COGS)">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Info */}
        <div className="bg-gray-50 dark:bg-[#3a3a3a]/50 rounded-lg p-4 border border-gray-200 dark:border-[#3a3a3a]">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {product.name}
          </h4>
          {variant && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Variant: {variant.name}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Current Cost: <span className="font-semibold">${currentCogs.toFixed(2)}</span>
          </p>
        </div>

        {/* New COGS Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            New Cost (COGS) *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={newCogs}
              onChange={(e) => setNewCogs(e.target.value)}
              placeholder="0.00"
              required
              disabled={isSubmitting}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-[#3a3a3a] text-gray-900 dark:text-white border-gray-300 dark:border-[#4a4a4a] focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-[#3a3a3a]"
            />
          </div>

          {/* Cost Change Indicator */}
          {!isNaN(parseFloat(newCogs)) && parseFloat(newCogs) !== currentCogs && (
            <div
              className={`mt-2 text-sm ${
                costDifference > 0
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-green-600 dark:text-green-400'
              }`}
            >
              {costDifference > 0 ? '↑' : '↓'} $
              {Math.abs(costDifference).toFixed(2)} (
              {percentageChange > 0 ? '+' : ''}
              {percentageChange.toFixed(1)}%)
            </div>
          )}
        </div>

        {/* Reason for Change */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Reason for Change *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Supplier increased prices, exchange rate changes, etc."
            rows={3}
            required
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-[#3a3a3a] text-gray-900 dark:text-white border-gray-300 dark:border-[#4a4a4a] focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-[#3a3a3a] resize-none"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            This will be visible to the user
          </p>
        </div>

        {/* Admin Notes (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Internal Notes (Optional)
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Private notes for admins only..."
            rows={2}
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-[#3a3a3a] text-gray-900 dark:text-white border-gray-300 dark:border-[#4a4a4a] focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-[#3a3a3a] resize-none"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Only visible to admins, not the user
          </p>
        </div>

        {/* Expiration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Expiration (Days)
          </label>
          <input
            type="number"
            min="1"
            max="90"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-[#3a3a3a] text-gray-900 dark:text-white border-gray-300 dark:border-[#4a4a4a] focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-[#3a3a3a]"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            User has this many days to accept or reject
          </p>
        </div>

        {/* Warning Note */}
        <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">User must accept this change</p>
            <p className="text-xs">
              The user will receive a notification and chat message. Once accepted, this cost will
              apply to all pending and future invoices.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-6 py-4 -mx-6 -mb-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting && <Loader2 className="btn-icon animate-spin" />}
            <span>{isSubmitting ? 'Sending...' : 'Send for Review'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
