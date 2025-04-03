import React, { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentMethod, getPaymentMethods } from '@/lib/payments';
import { PaymentMethodList } from './PaymentMethodList';
import AddPaymentMethodModal from './AddPaymentMethodModal';

export const PaymentMethodManager: React.FC = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [defaultMethodId, setDefaultMethodId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const data = await getPaymentMethods('customer_id');
      setMethods(data.methods);
      setDefaultMethodId(data.defaultMethodId);
    } catch (error) {
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setMethods(prev => prev.filter(method => method.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setDefaultMethodId(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading payment methods...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 text-sm text-white bg-gray-900 dark:bg-gray-800 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Payment Method
        </button>
      </div>

      {methods.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No payment methods</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add a payment method to start making payments
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 text-sm text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
          >
            Add Payment Method
          </button>
        </div>
      ) : (
        <PaymentMethodList
          methods={methods}
          defaultMethodId={defaultMethodId}
          onDelete={handleDelete}
          onSetDefault={handleSetDefault}
        />
      )}

      {showAddModal && (
        <AddPaymentMethodModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadPaymentMethods();
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};