import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Loader2,
  FileText,
  X,
  DollarSign,
  Tag,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ProductTemplateSelectorModal } from '@/components/admin/ProductTemplateSelectorModal';

interface CustomerSidebarProps {
  threadId: string;
  userId: string;
  isExpanded: boolean;
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
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  billing_country: string | null;
  order_number: string;
  total_price: number;
  subtotal_price: number;
  total_tax: number;
  total_shipping: number;
  total_discounts: number;
  discount_codes: string[];
  currency: string;
  ordered_at: string;
  fulfillment_status: string | null;
  financial_status: string | null;
  is_repeat_customer: boolean;
  order_count: number;
  note: string | null;
  tags: string | null;
}

export const CustomerSidebar: React.FC<CustomerSidebarProps> = ({
  threadId,
  userId,
  isExpanded,
}) => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [userName, setUserName] = useState('');
  const [lineItems, setLineItems] = useState<any[]>([]);

  useEffect(() => {
    if (threadId && isExpanded) {
      loadCustomerInfo();
      loadUserName();
    }
  }, [threadId, isExpanded]);

  const loadUserName = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, company, email')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        const name = data.first_name && data.last_name
          ? `${data.first_name} ${data.last_name}`
          : data.company || data.email?.split('@')[0];
        setUserName(name);
      }
    } catch (error) {
      console.error('Error loading user name:', error);
    }
  };

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
          billing_address_line1,
          billing_address_line2,
          billing_city,
          billing_state,
          billing_zip,
          billing_country,
          order_number,
          total_price,
          subtotal_price,
          total_tax,
          total_shipping,
          total_discounts,
          discount_codes,
          currency,
          ordered_at,
          fulfillment_status,
          financial_status,
          is_repeat_customer,
          order_count,
          note,
          tags,
          shopify_order_id
        `)
        .eq('id', thread.order_id)
        .single();

      if (orderError) throw orderError;

      setCustomerInfo(order);

      // Load line items
      const { data: items } = await supabase
        .from('order_line_items')
        .select('*')
        .eq('shopify_order_id', order.shopify_order_id);

      if (items) {
        setLineItems(items);
      }
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
    if (!customerInfo) return 'Guest Customer';
    if (customerInfo.customer_first_name || customerInfo.customer_last_name) {
      return [customerInfo.customer_first_name, customerInfo.customer_last_name]
        .filter(Boolean)
        .join(' ');
    }
    if (customerInfo.customer_email) {
      const emailPrefix = customerInfo.customer_email.split('@')[0];
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
    return 'Guest Customer';
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
    <>
      <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-hidden transition-all duration-300">
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
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {getCustomerName()}
                    </h3>
                    {customerInfo.is_repeat_customer && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Repeat Customer ({customerInfo.order_count})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-gradient-to-b from-red-500 to-pink-600 rounded-full" />
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Contact
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowTemplateSelector(true)}
                    className="text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20"
                    title="Email templates"
                  >
                    <FileText className="w-3 h-3" />
                    Templates
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </div>
                  <p className={`text-sm ${customerInfo.customer_email ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'} break-all`}>
                    {customerInfo.customer_email || 'Not provided'}
                  </p>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Phone</span>
                  </div>
                  <p className={`text-sm ${customerInfo.customer_phone ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                    {customerInfo.customer_phone || 'Not provided'}
                  </p>
                </div>
              </div>

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
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Order Number
                    </span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {customerInfo.order_number}
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
                      Fulfillment Status
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      customerInfo.fulfillment_status === 'fulfilled'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}>
                      {customerInfo.fulfillment_status || 'pending'}
                    </span>
                  </div>

                  {customerInfo.financial_status && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Payment Status
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        customerInfo.financial_status === 'paid'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      }`}>
                        {customerInfo.financial_status}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-gradient-to-b from-red-500 to-pink-600 rounded-full" />
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Items Purchased
                  </h4>
                </div>

                {lineItems.length > 0 ? (
                  <div className="space-y-3">
                    {lineItems.map((item, idx) => (
                      <div key={`${item.product_name}-${idx}`} className="text-sm">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1">
                            <p className="text-gray-900 dark:text-white font-medium">
                              {item.product_name}
                            </p>
                            {item.variant_name && item.variant_name !== item.product_name && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {item.variant_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>Qty: {item.quantity}</span>
                          {item.unit_price > 0 && (
                            <span>
                              {formatCurrency(item.unit_price * item.quantity, customerInfo.currency)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    No items available
                  </p>
                )}
              </div>

              {/* Transaction Breakdown */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-gradient-to-b from-red-500 to-pink-600 rounded-full" />
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Order Summary
                  </h4>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Subtotal
                    </span>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatCurrency(customerInfo.subtotal_price, customerInfo.currency)}
                    </p>
                  </div>

                  {customerInfo.total_shipping > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Shipping
                      </span>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {formatCurrency(customerInfo.total_shipping, customerInfo.currency)}
                      </p>
                    </div>
                  )}

                  {customerInfo.total_tax > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Tax
                      </span>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {formatCurrency(customerInfo.total_tax, customerInfo.currency)}
                      </p>
                    </div>
                  )}

                  {customerInfo.total_discounts > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-red-500 dark:text-red-400">
                        Discount
                      </span>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        -{formatCurrency(customerInfo.total_discounts, customerInfo.currency)}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Total
                    </span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(customerInfo.total_price, customerInfo.currency)}
                    </p>
                  </div>
                </div>

                {customerInfo.discount_codes && customerInfo.discount_codes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Discount Codes Used
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {customerInfo.discount_codes.map((code, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Line Items */}
              {lineItems.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-gradient-to-b from-red-500 to-pink-600 rounded-full" />
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Items Purchased
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {lineItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between text-sm"
                      >
                        <div className="flex-1">
                          <p className="text-gray-900 dark:text-white font-medium">
                            {item.product_name}
                          </p>
                          {item.variant_name && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {item.variant_name}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-gray-900 dark:text-white">
                            x{item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-gradient-to-b from-red-500 to-pink-600 rounded-full" />
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Shipping Address
                  </h4>
                </div>

                {customerInfo.shipping_address_line1 ? (
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
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    No shipping address provided
                  </p>
                )}
              </div>

              {/* Billing Address */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-gradient-to-b from-red-500 to-pink-600 rounded-full" />
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Billing Address
                  </h4>
                </div>

                {customerInfo.billing_address_line1 ? (
                  <div className="flex items-start gap-2">
                    <CreditCard className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <p>{customerInfo.billing_address_line1}</p>
                      {customerInfo.billing_address_line2 && (
                        <p>{customerInfo.billing_address_line2}</p>
                      )}
                      <p>
                        {[
                          customerInfo.billing_city,
                          customerInfo.billing_state,
                          customerInfo.billing_zip,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                      {customerInfo.billing_country && (
                        <p>{customerInfo.billing_country}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    No billing address provided
                  </p>
                )}
              </div>

              {/* Customer Notes */}
              {customerInfo.note && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-gradient-to-b from-red-500 to-pink-600 rounded-full" />
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Customer Note
                    </h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                    "{customerInfo.note}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && customerInfo && (
        <ProductTemplateSelectorModal
          isOpen={showTemplateSelector}
          onClose={() => setShowTemplateSelector(false)}
          userId={userId}
          userName={userName}
        />
      )}
    </>
  );
};
