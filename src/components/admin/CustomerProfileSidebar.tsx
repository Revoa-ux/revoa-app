import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Loader2,
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CustomerProfileSidebarProps {
  threadId: string;
  isExpanded: boolean;
  onClose: () => void;
}

interface CustomerInfo {
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  shipping_country: string | null;
  order_number: string;
  total_price: number;
  currency: string;
  ordered_at: string;
  fulfillment_status: string | null;
}

export const CustomerProfileSidebar: React.FC<CustomerProfileSidebarProps> = ({
  threadId,
  isExpanded,
  onClose,
}) => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (threadId && isExpanded) {
      loadCustomerInfo();
    }
  }, [threadId, isExpanded]);

  const loadCustomerInfo = async () => {
    setIsLoading(true);
    try {
      // Get thread with order_id
      const { data: thread, error: threadError } = await supabase
        .from('chat_threads')
        .select('order_id')
        .eq('id', threadId)
        .single();

      if (threadError) throw threadError;

      if (!thread.order_id) {
        setCustomerInfo(null);
        setIsLoading(false);
        return;
      }

      // Get customer info from order
      const { data: order, error: orderError } = await supabase
        .from('shopify_orders')
        .select(`
          customer_first_name,
          customer_last_name,
          customer_email,
          customer_phone,
          shipping_address_line1,
          shipping_address_line2,
          shipping_city,
          shipping_state,
          shipping_zip,
          shipping_country,
          order_number,
          total_price,
          currency,
          ordered_at,
          fulfillment_status
        `)
        .eq('id', thread.order_id)
        .single();

      if (orderError) throw orderError;

      setCustomerInfo(order);
    } catch (error) {
      console.error('Error loading customer info:', error);
      toast.error('Failed to load customer information');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isExpanded) {
    return null;
  }

  const getCustomerName = () => {
    if (!customerInfo) return 'Customer';
    if (customerInfo.customer_first_name || customerInfo.customer_last_name) {
      return [customerInfo.customer_first_name, customerInfo.customer_last_name]
        .filter(Boolean)
        .join(' ');
    }
    return 'Customer';
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="max-sm:absolute sm:relative right-0 inset-y-0 max-sm:z-40 sm:z-0 w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-hidden transition-all duration-300 ease-out">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Customer Profile
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors sm:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !customerInfo ? (
          <div className="flex items-center justify-center py-12 px-6 text-center">
            <div>
              <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No customer information available
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Header Section */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200/80 via-gray-300/70 to-gray-200/60 dark:from-gray-700/50 dark:via-gray-600/40 dark:to-gray-700/50 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {getCustomerName()}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Customer
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-red-500 to-pink-600 rounded-full" />
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Contact
                </h4>
              </div>

              {customerInfo.customer_email && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white break-all">
                    {customerInfo.customer_email}
                  </p>
                </div>
              )}

              {customerInfo.customer_phone && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Phone</span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {customerInfo.customer_phone}
                  </p>
                </div>
              )}
            </div>

            {/* Shipping Address */}
            {customerInfo.shipping_address_line1 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-gradient-to-b from-red-500 to-pink-600 rounded-full" />
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Shipping Address
                  </h4>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <p>{customerInfo.shipping_address_line1}</p>
                    {customerInfo.shipping_address_line2 && (
                      <p>{customerInfo.shipping_address_line2}</p>
                    )}
                    <p>
                      {[
                        customerInfo.shipping_city,
                        customerInfo.shipping_state,
                        customerInfo.shipping_zip,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    {customerInfo.shipping_country && (
                      <p>{customerInfo.shipping_country}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Order Information */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-red-500 to-pink-600 rounded-full" />
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Order Details
                </h4>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Package className="w-3.5 h-3.5" />
                    <span>Order Number</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    #{customerInfo.order_number}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Total
                  </span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(customerInfo.total_price, customerInfo.currency)}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Date
                  </span>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDate(customerInfo.ordered_at)}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Status
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    customerInfo.fulfillment_status === 'fulfilled'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  }`}>
                    {customerInfo.fulfillment_status || 'pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
