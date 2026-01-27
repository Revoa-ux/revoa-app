import React from 'react';
import { CreditCard, Banknote, Trash2, Star, AlertTriangle } from 'lucide-react';
import { toast } from '../../lib/toast';
import { PaymentMethod, deletePaymentMethod, setDefaultPaymentMethod } from '@/lib/payments';

interface PaymentMethodListProps {
  methods: PaymentMethod[];
  defaultMethodId?: string;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export const PaymentMethodList: React.FC<PaymentMethodListProps> = ({
  methods,
  defaultMethodId,
  onDelete,
  onSetDefault
}) => {
  const handleDelete = async (id: string) => {
    try {
      await deletePaymentMethod(id);
      onDelete(id);
      toast.success('Payment method removed');
    } catch (error) {
      toast.error('Failed to remove payment method');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultPaymentMethod('customer_id', id);
      onSetDefault(id);
      toast.success('Default payment method updated');
    } catch (error) {
      toast.error('Failed to update default payment method');
    }
  };

  const getExpirationStatus = (method: PaymentMethod) => {
    if (method.type !== 'card' || !method.expiryMonth || !method.expiryYear) {
      return null;
    }

    const today = new Date();
    const expDate = new Date(method.expiryYear, method.expiryMonth - 1);
    const monthsUntilExpiry = (expDate.getFullYear() - today.getFullYear()) * 12 +
      (expDate.getMonth() - today.getMonth());

    if (monthsUntilExpiry <= 0) {
      return { type: 'expired' as const };
    }

    if (monthsUntilExpiry <= 3) {
      return {
        type: 'expiring' as const,
        months: monthsUntilExpiry
      };
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {methods.map((method) => {
        const isDefault = method.id === defaultMethodId;
        const expirationStatus = getExpirationStatus(method);

        return (
          <div
            key={method.id}
            className={`p-4 rounded-lg border transition-colors ${
              isDefault 
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                : 'border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-dark/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {method.type === 'card' ? (
                  <CreditCard className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                ) : (
                  <Banknote className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {method.type === 'card'
                        ? `${method.brand} ****${method.last4}`
                        : 'PayPal Account'}
                    </p>
                    {isDefault && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {method.type === 'card'
                      ? `Expires ${method.expiryMonth}/${method.expiryYear}`
                      : method.billingDetails?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {!isDefault && (
                  <button
                    onClick={() => handleSetDefault(method.id)}
                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
                    title="Set as default"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(method.id)}
                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Remove payment method"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {expirationStatus && (
              <div className={`mt-3 p-2 rounded-lg flex items-start space-x-2 ${
                expirationStatus.type === 'expired'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30'
              }`}>
                <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                  expirationStatus.type === 'expired'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`} />
                <p className={`text-sm ${
                  expirationStatus.type === 'expired'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {expirationStatus.type === 'expired'
                    ? 'This card has expired. Please update or remove it.'
                    : `This card will expire in ${expirationStatus.months} month${
                        expirationStatus.months === 1 ? '' : 's'
                      }. Consider updating it soon.`}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
