import React, { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from '../../lib/toast';
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
      {methods.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm mx-auto mb-4" style={{ backgroundColor: 'rgba(107, 114, 128, 0.15)' }}>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: '#6B7280',
                boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
              }}
            >
              <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No payment methods</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Add a payment method to start making payments
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-secondary group px-4 py-2 text-sm flex items-center mx-auto"
          >
            <Plus className="btn-icon mr-2 transition-transform group-hover:scale-110" />
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
