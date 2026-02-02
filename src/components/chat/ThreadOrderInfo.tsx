import React, { useState, useEffect } from 'react';
import { Package, Truck, ExternalLink, Edit2, Check, X, Loader2, Clock, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '../../lib/toast';
import { analyzeOrderDelay, type DelayAnalysis } from '@/lib/packageDelayDetectionService';

interface ThreadOrderInfoProps {
  threadId: string;
  orderId?: string;
  isAdmin?: boolean;
}

interface OrderInfo {
  order_number: string;
  fulfillment_status: string;
  warehouse_entry_number: string | null;
}

interface TrackingInfo {
  tracking_number: string;
  tracking_company: string;
  tracking_url: string;
  last_mile_tracking_number: string | null;
  last_mile_carrier: string | null;
  shipment_status: string;
}

export function ThreadOrderInfo({ threadId, orderId, isAdmin = false }: ThreadOrderInfoProps) {
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo[]>([]);
  const [delayAnalysis, setDelayAnalysis] = useState<DelayAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingWEN, setIsEditingWEN] = useState(false);
  const [wenValue, setWenValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderInfo();
    } else {
      fetchThreadInfo();
    }
  }, [orderId, threadId]);

  const fetchThreadInfo = async () => {
    setIsLoading(true);
    try {
      // Get thread with WEN
      const { data: thread, error } = await supabase
        .from('chat_threads')
        .select('warehouse_entry_number, order_id')
        .eq('id', threadId)
        .single();

      if (error) throw error;

      setWenValue(thread.warehouse_entry_number || '');

      // If thread has linked order, fetch order info
      if (thread.order_id) {
        await fetchOrderInfo(thread.order_id);
      }
    } catch (error) {
      console.error('Error fetching thread info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrderInfo = async (id?: string) => {
    const orderIdToFetch = id || orderId;
    if (!orderIdToFetch) return;

    try {
      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from('shopify_orders')
        .select('order_number, fulfillment_status')
        .eq('id', orderIdToFetch)
        .single();

      if (orderError) throw orderError;

      setOrderInfo(order);

      // Fetch tracking information
      const { data: fulfillments, error: trackingError } = await supabase
        .from('shopify_order_fulfillments')
        .select('*')
        .eq('order_id', orderIdToFetch)
        .order('created_at', { ascending: false });

      if (trackingError) throw trackingError;

      setTrackingInfo(fulfillments || []);

      // Fetch delay analysis if order is fulfilled
      if (order.fulfillment_status === 'fulfilled') {
        const analysis = await analyzeOrderDelay(orderIdToFetch);
        setDelayAnalysis(analysis);
      }
    } catch (error) {
      console.error('Error fetching order info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWEN = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('chat_threads')
        .update({ warehouse_entry_number: wenValue || null })
        .eq('id', threadId);

      if (error) throw error;

      toast.success('WEN updated successfully');
      setIsEditingWEN(false);
    } catch (error) {
      console.error('Error updating WEN:', error);
      toast.error('Failed to update WEN');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!orderInfo && !wenValue) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 dark:border-[#3a3a3a]">
      <div className="p-4 space-y-4">
        <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Order Information
        </h3>

        {/* Order Number & Status */}
        {orderInfo && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Order:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                #{orderInfo.order_number}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                orderInfo.fulfillment_status === 'fulfilled'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              }`}>
                {orderInfo.fulfillment_status || 'pending'}
              </span>
            </div>
          </div>
        )}

        {/* WEN */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Warehouse Entry Number
            </span>
            {isAdmin && !isEditingWEN && (
              <button
                onClick={() => setIsEditingWEN(true)}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                {wenValue ? 'Edit' : 'Add'}
              </button>
            )}
          </div>

          {isEditingWEN && isAdmin ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={wenValue}
                onChange={(e) => setWenValue(e.target.value)}
                placeholder="Enter WEN..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white"
                autoFocus
              />
              <button
                onClick={handleSaveWEN}
                disabled={isSaving}
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setIsEditingWEN(false);
                  fetchThreadInfo();
                }}
                className="p-2 bg-gray-200 dark:bg-[#3a3a3a] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-[#4a4a4a]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : wenValue ? (
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-mono font-medium text-blue-900 dark:text-blue-100">
                {wenValue}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No WEN assigned
            </p>
          )}
        </div>

        {/* Delivery Timeline */}
        {delayAnalysis && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Delivery Timeline
            </h4>

            <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#171717] dark:to-[#2a2a2a] border border-gray-200 dark:border-[#3a3a3a] rounded-lg space-y-3">
              {/* Timeline Visualization */}
              <div className="relative">
                <div className="flex items-center justify-between">
                  {/* Fulfilled */}
                  <div className="flex flex-col items-center gap-1 z-10">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Shipped</span>
                    {delayAnalysis.fulfillmentDate && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(delayAnalysis.fulfillmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {/* Progress Line */}
                  <div className="flex-1 h-1 mx-2 bg-gray-300 dark:bg-[#4a4a4a] relative">
                    <div
                      className={`h-full transition-all ${
                        delayAnalysis.status === 'on_time' || delayAnalysis.status === 'arriving_today'
                          ? 'bg-green-500'
                          : delayAnalysis.status === 'slightly_delayed'
                          ? 'bg-amber-500'
                          : delayAnalysis.status === 'significantly_delayed'
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                      }`}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Expected Delivery */}
                  <div className="flex flex-col items-center gap-1 z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      delayAnalysis.status === 'on_time' || delayAnalysis.status === 'arriving_today'
                        ? 'bg-green-500'
                        : delayAnalysis.status === 'slightly_delayed'
                        ? 'bg-amber-500'
                        : delayAnalysis.status === 'significantly_delayed'
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                    }`}>
                      {delayAnalysis.status === 'arriving_today' ? (
                        <Package className="w-4 h-4 text-white" />
                      ) : delayAnalysis.isDelayed ? (
                        <AlertCircle className="w-4 h-4 text-white" />
                      ) : (
                        <Calendar className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Expected</span>
                    {delayAnalysis.expectedDeliveryDate && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(delayAnalysis.expectedDeliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-[#3a3a3a]">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  delayAnalysis.status === 'on_time'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : delayAnalysis.status === 'arriving_today'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : delayAnalysis.status === 'slightly_delayed'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    : delayAnalysis.status === 'significantly_delayed'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-dark text-gray-700 dark:text-gray-400'
                }`}>
                  {delayAnalysis.status === 'on_time' && '✓ On Time'}
                  {delayAnalysis.status === 'arriving_today' && '📦 Arriving Today'}
                  {delayAnalysis.status === 'slightly_delayed' && `⏱ ${delayAnalysis.daysPastExpected}d Delayed`}
                  {delayAnalysis.status === 'significantly_delayed' && `⚠️ ${delayAnalysis.daysPastExpected}d Delayed`}
                </span>

                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {delayAnalysis.businessDaysElapsed} business days elapsed
                </span>
              </div>

              {/* Admin Note (Admin Only) */}
              {isAdmin && delayAnalysis.internalNote && (
                <div className="pt-2 border-t border-gray-200 dark:border-[#3a3a3a]">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {delayAnalysis.internalNote}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tracking Information */}
        {trackingInfo.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Tracking
            </h4>
            {trackingInfo.map((tracking, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg space-y-2"
              >
                {/* Primary Tracking */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {tracking.tracking_company}
                      </span>
                    </div>
                    <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                      {tracking.tracking_number}
                    </p>
                  </div>
                  {tracking.tracking_url && (
                    <a
                      href={tracking.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                      title="Track package"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Last Mile Tracking */}
                {tracking.last_mile_tracking_number && (
                  <div className="pt-2 border-t border-gray-200 dark:border-[#3a3a3a]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Last Mile: {tracking.last_mile_carrier || 'USPS/Local Post'}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-gray-700 dark:text-gray-300">
                      {tracking.last_mile_tracking_number}
                    </p>
                  </div>
                )}

                {/* Status */}
                <div className="pt-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    tracking.shipment_status === 'delivered'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : tracking.shipment_status === 'in_transit'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : tracking.shipment_status === 'exception'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-gray-100 dark:bg-dark text-gray-700 dark:text-gray-400'
                  }`}>
                    {tracking.shipment_status?.replace('_', ' ') || 'pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
