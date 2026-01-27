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
  CreditCard,
  XCircle,
  Truck,
  ExternalLink,
  Edit2,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '../../lib/toast';
import { CancelOrderModal } from '@/components/chat/CancelOrderModal';
import { RefundOrderModal } from '@/components/chat/RefundOrderModal';
import { EditShippingAddressModal } from '@/components/chat/EditShippingAddressModal';
import { EditBillingAddressModal } from '@/components/chat/EditBillingAddressModal';
import { UpdateEmailModal } from '@/components/chat/UpdateEmailModal';
import { UpdatePhoneModal } from '@/components/chat/UpdatePhoneModal';
import { getShopifyOrderUrl } from '@/lib/shopifyOrders';
import { cn } from '@/lib/utils';
import { getOrderWarrantyStatus, formatWarrantyStatus, getCoverageDescription } from '@/lib/warrantyService';
import type { OrderWarrantyStatus } from '@/lib/warrantyService';

const BRAND_GRADIENT = 'linear-gradient(135deg, #E11D48 0%, #EC4899 40%, #F87171 70%, #E8795A 100%)';

interface CustomerProfileSidebarProps {
  threadId: string;
  userId: string;
  isExpanded: boolean;
  onClose?: () => void;
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

export const CustomerProfileSidebar: React.FC<CustomerProfileSidebarProps> = ({
  threadId,
  userId,
  isExpanded,
  onClose,
}) => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showEditShippingModal, setShowEditShippingModal] = useState(false);
  const [showEditBillingModal, setShowEditBillingModal] = useState(false);
  const [showUpdateEmailModal, setShowUpdateEmailModal] = useState(false);
  const [showUpdatePhoneModal, setShowUpdatePhoneModal] = useState(false);
  const [orderId, setOrderId] = useState<string>('');
  const [threadTag, setThreadTag] = useState<string>('');
  const [warrantyStatus, setWarrantyStatus] = useState<OrderWarrantyStatus | null>(null);

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
    console.log('[CustomerProfileSidebar] Starting to load customer info for thread:', threadId);

    try {
      // Get thread with order_id and tag
      console.log('[CustomerProfileSidebar] Fetching thread data...');
      const { data: thread, error: threadError } = await supabase
        .from('chat_threads')
        .select('order_id, tag')
        .eq('id', threadId)
        .single();

      if (threadError) {
        console.error('[CustomerProfileSidebar] Thread query error:', threadError);
        toast.error(`Thread query failed: ${threadError.message}`);
        throw threadError;
      }

      console.log('[CustomerProfileSidebar] Thread data loaded:', thread);

      // Store thread tag for template filtering
      setThreadTag(thread.tag || '');

      if (!thread.order_id) {
        console.warn('[CustomerProfileSidebar] Thread has no order_id:', threadId);
        toast.info('This thread is not linked to an order');
        setCustomerInfo(null);
        setIsLoading(false);
        return;
      }

      console.log('[CustomerProfileSidebar] Loading customer info for order:', thread.order_id);
      toast.info('Loading order details...');

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

      if (orderError) {
        console.error('[CustomerProfileSidebar] Order query error:', {
          error: orderError,
          message: orderError.message,
          code: orderError.code,
          details: orderError.details,
          hint: orderError.hint
        });
        toast.error(`Order query failed: ${orderError.message} (Code: ${orderError.code})`);
        throw orderError;
      }

      console.log('[CustomerProfileSidebar] Order data loaded:', order);
      toast.success('Order details loaded');

      setCustomerInfo(order);
      setOrderId(thread.order_id); // Store order ID for actions

      // Load line items
      console.log('[CustomerProfileSidebar] Loading line items...');
      const { data: items, error: itemsError } = await supabase
        .from('order_line_items')
        .select('*')
        .eq('shopify_order_id', order.shopify_order_id);

      if (itemsError) {
        console.error('[CustomerProfileSidebar] Line items query error:', itemsError);
        toast.warning('Could not load line items');
      } else {
        console.log('[CustomerProfileSidebar] Line items loaded:', items?.length || 0, 'items');
        if (items) {
          setLineItems(items);
        }
      }

      // Load warranty status
      if (thread.order_id) {
        console.log('[CustomerProfileSidebar] Loading warranty status...');
        const warranty = await getOrderWarrantyStatus(thread.order_id);
        console.log('[CustomerProfileSidebar] Warranty status loaded:', warranty);
        setWarrantyStatus(warranty);
      }
    } catch (error: any) {
      console.error('[CustomerProfileSidebar] Error loading customer info:', error);
      console.error('[CustomerProfileSidebar] Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
      toast.error(`Failed to load customer information: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

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
      <div
        className={cn(
          isExpanded ? 'translate-x-0' : 'translate-x-full',
          'absolute inset-0 lg:relative lg:inset-auto lg:translate-x-0 right-0 z-40 lg:z-0',
          'lg:w-64 xl:w-80',
          'bg-white dark:bg-dark border-l border-gray-200 dark:border-[#333333]',
          'flex flex-col overflow-hidden',
          'transition-transform duration-300 ease-in-out'
        )}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Mobile/Tablet Close Button */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#333333]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Info</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

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
              {/* Contact Section at Top */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                    Contact
                  </h4>
                </div>

                {/* Customer Name */}
                <div className="mb-3 p-2 border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-dark">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Name</span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {getCustomerName()}
                  </p>
                  {customerInfo.is_repeat_customer && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 mt-1">
                      <TrendingUp className="w-3 h-3" />
                      Repeat Customer ({customerInfo.order_count})
                    </span>
                  )}
                </div>

                {/* Phone */}
                <button
                  onClick={() => {
                    setShowUpdatePhoneModal(true);
                  }}
                  className="w-full p-2 border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-dark hover:border-gray-900 dark:hover:border-gray-400 transition-colors text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span>Phone</span>
                    </div>
                    <Edit2 className="w-3 h-3 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors" />
                  </div>
                  <p className={`text-sm ${customerInfo.customer_phone ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                    {customerInfo.customer_phone || 'Not provided'}
                  </p>
                </button>
              </div>

              {/* Warranty Status Section */}
              {warrantyStatus && warrantyStatus.items.length > 0 && (
                <div className="border-t border-gray-200 dark:border-[#333333] pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 rounded-full" style={{ background: BRAND_GRADIENT }} />
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Warranty Status
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {warrantyStatus.items.map((item, idx) => {
                      const { badge, message } = formatWarrantyStatus(item.warranty);
                      const coverageDesc = getCoverageDescription(item.warranty);

                      return (
                        <div key={idx} className="p-3 border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-dark">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {item.productName}
                              </p>
                              {item.variantTitle && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {item.variantTitle}
                                </p>
                              )}
                            </div>
                            <div className="flex-shrink-0 ml-2">
                              {item.warranty.status === 'active' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {badge.text}
                                </span>
                              )}
                              {item.warranty.status === 'expiring_soon' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                                  <Clock className="w-3 h-3" />
                                  {badge.text}
                                </span>
                              )}
                              {item.warranty.status === 'expired' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium">
                                  <AlertCircle className="w-3 h-3" />
                                  {badge.text}
                                </span>
                              )}
                              {item.warranty.status === 'none' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-[#3a3a3a] text-gray-600 dark:text-gray-400 text-xs font-medium">
                                  {badge.text}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {message}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                              <Shield className="w-3 h-3" />
                              <span>Coverage: {coverageDesc}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Overall warranty summary */}
                  <div className="mt-3 p-2 bg-gray-50 dark:bg-dark/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs">
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Order placed {formatDate(warrantyStatus.orderDate.toISOString())}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Information */}
              <div className="border-t border-gray-200 dark:border-[#333333] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full" style={{ background: BRAND_GRADIENT }} />
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Order Details
                    </h4>
                  </div>
                  <button
                    onClick={async () => {
                      const url = await getShopifyOrderUrl(orderId);
                      if (url) {
                        window.open(url, '_blank');
                      } else {
                        toast.error('Unable to open Shopify order');
                      }
                    }}
                    className="text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]"
                    title="View in Shopify"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Shopify
                  </button>
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

                {/* Order Actions */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={customerInfo.fulfillment_status === 'fulfilled' || customerInfo.fulfillment_status === 'cancelled'}
                    className="relative flex items-center justify-center gap-1.5 px-5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#4a4a4a] rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-[#2a2a2a] dark:to-[#2a2a2a]/50 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm transition-all overflow-hidden whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 dark:disabled:hover:border-gray-600 disabled:hover:shadow-none group"
                    title={customerInfo.fulfillment_status === 'fulfilled' ? 'Cannot cancel fulfilled orders' : 'Cancel this order'}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(107,114,128,0.04)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(156,163,175,0.06)_0%,transparent_50%)]"></div>
                    <XCircle className="relative w-3.5 h-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    <span className="relative">Cancel</span>
                  </button>
                  <button
                    onClick={() => setShowRefundModal(true)}
                    className="relative flex items-center justify-center gap-1.5 px-5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#4a4a4a] rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-[#2a2a2a] dark:to-[#2a2a2a]/50 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm transition-all overflow-hidden whitespace-nowrap group"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(107,114,128,0.04)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_20%,rgba(156,163,175,0.06)_0%,transparent_50%)]"></div>
                    <DollarSign className="relative w-3.5 h-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    <span className="relative">Refund</span>
                  </button>
                </div>
              </div>

              {/* Line Items */}
              <div className="border-t border-gray-200 dark:border-[#333333] pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full" style={{ background: BRAND_GRADIENT }} />
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
              <div className="border-t border-gray-200 dark:border-[#333333] pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full" style={{ background: BRAND_GRADIENT }} />
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

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-[#333333]">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Total
                    </span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(customerInfo.total_price, customerInfo.currency)}
                    </p>
                  </div>
                </div>

                {customerInfo.discount_codes && customerInfo.discount_codes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#333333]">
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
                          className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-[#3a3a3a] text-gray-700 dark:text-gray-300"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Shipping Address */}
              <div className="border-t border-gray-200 dark:border-[#333333] pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full" style={{ background: BRAND_GRADIENT }} />
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Shipping Address
                  </h4>
                </div>

                <button
                  onClick={() => setShowEditShippingModal(true)}
                  disabled={customerInfo.fulfillment_status === 'fulfilled' || customerInfo.fulfillment_status === 'shipped'}
                  className="w-full p-2 border border-gray-200 dark:border-[#333333] rounded-lg hover:border-gray-900 dark:hover:border-gray-400 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700 disabled:hover:bg-transparent"
                  title={customerInfo.fulfillment_status === 'fulfilled' || customerInfo.fulfillment_status === 'shipped' ? 'Cannot edit address after shipment' : 'Edit shipping address'}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      <Truck className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className={`text-sm ${customerInfo.shipping_address_line1 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                        {customerInfo.shipping_address_line1 ? (
                          <>
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
                          </>
                        ) : (
                          <p>No shipping address provided</p>
                        )}
                      </div>
                    </div>
                    {!(customerInfo.fulfillment_status === 'fulfilled' || customerInfo.fulfillment_status === 'shipped') && (
                      <Edit2 className="w-3 h-3 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors flex-shrink-0 ml-2 mt-1" />
                    )}
                  </div>
                </button>
              </div>

              {/* Billing Address */}
              <div className="border-t border-gray-200 dark:border-[#333333] pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full" style={{ background: BRAND_GRADIENT }} />
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Billing Address
                  </h4>
                </div>

                <button
                  onClick={() => setShowEditBillingModal(true)}
                  className="w-full p-2 border border-gray-200 dark:border-[#333333] rounded-lg hover:border-gray-900 dark:hover:border-gray-400 transition-colors text-left group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      <CreditCard className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className={`text-sm ${customerInfo.billing_address_line1 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                        {customerInfo.billing_address_line1 ? (
                          <>
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
                          </>
                        ) : (
                          <p>No billing address provided</p>
                        )}
                      </div>
                    </div>
                    <Edit2 className="w-3 h-3 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors flex-shrink-0 ml-2 mt-1" />
                  </div>
                </button>
              </div>

              {/* Customer Notes */}
              {customerInfo.note && (
                <div className="border-t border-gray-200 dark:border-[#333333] pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 rounded-full" style={{ background: BRAND_GRADIENT }} />
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

      {/* Order Action Modals */}
      {customerInfo && orderId && (
        <>
          <CancelOrderModal
            isOpen={showCancelModal}
            onClose={() => setShowCancelModal(false)}
            orderId={orderId}
            orderNumber={customerInfo.order_number}
            totalPrice={customerInfo.total_price}
            currency={customerInfo.currency}
            onSuccess={() => {
              loadCustomerInfo();
            }}
          />

          <RefundOrderModal
            isOpen={showRefundModal}
            onClose={() => setShowRefundModal(false)}
            orderId={orderId}
            orderNumber={customerInfo.order_number}
            totalPrice={customerInfo.total_price}
            currency={customerInfo.currency}
            onSuccess={() => {
              loadCustomerInfo();
            }}
          />

          <EditShippingAddressModal
            isOpen={showEditShippingModal}
            onClose={() => setShowEditShippingModal(false)}
            orderId={orderId}
            orderNumber={customerInfo.order_number}
            currentAddress={{
              address1: customerInfo.shipping_address_line1 || '',
              address2: customerInfo.shipping_address_line2 || '',
              city: customerInfo.shipping_city || '',
              province: customerInfo.shipping_state || '',
              zip: customerInfo.shipping_zip || '',
              country: customerInfo.shipping_country || '',
            }}
            onSuccess={() => {
              loadCustomerInfo();
            }}
          />

          <EditBillingAddressModal
            isOpen={showEditBillingModal}
            onClose={() => setShowEditBillingModal(false)}
            orderId={orderId}
            orderNumber={customerInfo.order_number}
            currentAddress={{
              address1: customerInfo.billing_address_line1 || '',
              address2: customerInfo.billing_address_line2 || '',
              city: customerInfo.billing_city || '',
              province: customerInfo.billing_state || '',
              zip: customerInfo.billing_zip || '',
              country: customerInfo.billing_country || '',
            }}
            onSuccess={() => {
              loadCustomerInfo();
            }}
          />

          <UpdateEmailModal
            isOpen={showUpdateEmailModal}
            onClose={() => setShowUpdateEmailModal(false)}
            orderId={orderId}
            orderNumber={customerInfo.order_number}
            currentEmail={customerInfo.customer_email || ''}
            onSuccess={() => {
              loadCustomerInfo();
            }}
          />

          <UpdatePhoneModal
            isOpen={showUpdatePhoneModal}
            onClose={() => setShowUpdatePhoneModal(false)}
            orderId={orderId}
            orderNumber={customerInfo.order_number}
            currentPhone={customerInfo.customer_phone || ''}
            onSuccess={() => {
              loadCustomerInfo();
            }}
          />
        </>
      )}
    </>
  );
};
