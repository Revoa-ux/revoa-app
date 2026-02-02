import { supabase } from './supabase';
import {
  addBusinessDays,
  getBusinessDaysBetween,
  calculateExpectedDeliveryDate,
  formatBusinessDaysRange,
  isBusinessDay,
} from './businessDaysCalculator';
import { format, isPast, isToday, isFuture } from 'date-fns';

export type DelayStatus =
  | 'not_shipped'
  | 'on_time'
  | 'arriving_today'
  | 'slightly_delayed'
  | 'significantly_delayed'
  | 'unknown';

export interface DelayAnalysis {
  status: DelayStatus;
  isDelayed: boolean;
  daysPastExpected: number;
  expectedDeliveryDate: Date | null;
  fulfillmentDate: Date | null;
  businessDaysElapsed: number;
  estimatedTimeframe: string;
  customerMessage: string;
  internalNote: string;
  trackingInfo?: {
    trackingNumber: string;
    carrier: string;
  };
}

interface OrderData {
  id: string;
  shopify_order_id: string;
  fulfillment_status: string | null;
  fulfillment_created_at: string | null;
  tracking_number: string | null;
  tracking_company: string | null;
  expected_delivery_date: string | null;
}

interface QuoteData {
  shipping_timeframe_min: number;
  shipping_timeframe_max: number;
}

export async function analyzeOrderDelay(
  orderId: string
): Promise<DelayAnalysis | null> {
  const { data: order, error: orderError } = await supabase
    .from('shopify_orders')
    .select(
      'id, shopify_order_id, fulfillment_status, fulfillment_created_at, tracking_number, tracking_company, expected_delivery_date'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (orderError || !order) {
    console.error('Error fetching order:', orderError);
    return null;
  }

  const { data: lineItem } = await supabase
    .from('shopify_line_items')
    .select('quote_id')
    .eq('order_id', order.id)
    .not('quote_id', 'is', null)
    .maybeSingle();

  let shippingTimeframeMin = 4;
  let shippingTimeframeMax = 7;

  if (lineItem?.quote_id) {
    const { data: quote } = await supabase
      .from('product_quotes')
      .select('shipping_timeframe_min, shipping_timeframe_max')
      .eq('id', lineItem.quote_id)
      .maybeSingle();

    if (quote) {
      shippingTimeframeMin = quote.shipping_timeframe_min || 4;
      shippingTimeframeMax = quote.shipping_timeframe_max || 7;
    }
  }

  return analyzeDelay(order, shippingTimeframeMin, shippingTimeframeMax);
}

function analyzeDelay(
  order: OrderData,
  timeframeMin: number,
  timeframeMax: number
): DelayAnalysis {
  const now = new Date();

  if (!order.fulfillment_created_at || order.fulfillment_status !== 'fulfilled') {
    return {
      status: 'not_shipped',
      isDelayed: false,
      daysPastExpected: 0,
      expectedDeliveryDate: null,
      fulfillmentDate: null,
      businessDaysElapsed: 0,
      estimatedTimeframe: formatBusinessDaysRange(timeframeMin, timeframeMax),
      customerMessage:
        "Your order hasn't shipped yet. We'll notify you once it's on its way!",
      internalNote: 'Order not yet fulfilled in Shopify',
    };
  }

  const fulfillmentDate = new Date(order.fulfillment_created_at);
  const expectedDeliveryDate = calculateExpectedDeliveryDate(
    fulfillmentDate,
    timeframeMax
  );
  const businessDaysElapsed = getBusinessDaysBetween(fulfillmentDate, now);

  const trackingInfo = order.tracking_number
    ? {
        trackingNumber: order.tracking_number,
        carrier: order.tracking_company || 'Unknown',
      }
    : undefined;

  if (isToday(expectedDeliveryDate)) {
    return {
      status: 'arriving_today',
      isDelayed: false,
      daysPastExpected: 0,
      expectedDeliveryDate,
      fulfillmentDate,
      businessDaysElapsed,
      estimatedTimeframe: formatBusinessDaysRange(timeframeMin, timeframeMax),
      customerMessage: `Great news! Your package is expected to arrive today (${format(expectedDeliveryDate, 'MMM d')}).`,
      internalNote: `Package arriving today. Shipped ${businessDaysElapsed} business days ago.`,
      trackingInfo,
    };
  }

  if (isFuture(expectedDeliveryDate)) {
    return {
      status: 'on_time',
      isDelayed: false,
      daysPastExpected: 0,
      expectedDeliveryDate,
      fulfillmentDate,
      businessDaysElapsed,
      estimatedTimeframe: formatBusinessDaysRange(timeframeMin, timeframeMax),
      customerMessage: `Your package is on its way! Expected delivery: ${format(expectedDeliveryDate, 'EEEE, MMMM d')} (${formatBusinessDaysRange(timeframeMin, timeframeMax)} from shipment).`,
      internalNote: `On track. ${businessDaysElapsed} business days elapsed, expected by ${format(expectedDeliveryDate, 'MMM d')}.`,
      trackingInfo,
    };
  }

  const daysPastExpected = getBusinessDaysBetween(expectedDeliveryDate, now);

  if (daysPastExpected <= 2) {
    return {
      status: 'slightly_delayed',
      isDelayed: true,
      daysPastExpected,
      expectedDeliveryDate,
      fulfillmentDate,
      businessDaysElapsed,
      estimatedTimeframe: formatBusinessDaysRange(timeframeMin, timeframeMax),
      customerMessage: `Your package is running slightly behind schedule (${daysPastExpected} business ${daysPastExpected === 1 ? 'day' : 'days'} past expected delivery). This is usually due to carrier delays. It should arrive within the next 1-2 business days.`,
      internalNote: `Slightly delayed by ${daysPastExpected} business days. Monitor for customer escalation.`,
      trackingInfo,
    };
  }

  return {
    status: 'significantly_delayed',
    isDelayed: true,
    daysPastExpected,
    expectedDeliveryDate,
    fulfillmentDate,
    businessDaysElapsed,
    estimatedTimeframe: formatBusinessDaysRange(timeframeMin, timeframeMax),
    customerMessage: `We understand your package is taking longer than expected (${daysPastExpected} business days past the estimated delivery date). We're looking into this and will provide an update shortly.`,
    internalNote: `⚠️ SIGNIFICANTLY DELAYED by ${daysPastExpected} business days. Immediate attention required. Contact carrier.`,
    trackingInfo,
  };
}

export async function getDelayedOrders(
  limit: number = 50
): Promise<Array<{ orderId: string; analysis: DelayAnalysis }>> {
  const { data: orders } = await supabase
    .from('shopify_orders')
    .select(
      'id, shopify_order_id, fulfillment_status, fulfillment_created_at, tracking_number, tracking_company, expected_delivery_date'
    )
    .eq('fulfillment_status', 'fulfilled')
    .not('fulfillment_created_at', 'is', null)
    .order('fulfillment_created_at', { ascending: true })
    .limit(limit);

  if (!orders) return [];

  const results: Array<{ orderId: string; analysis: DelayAnalysis }> = [];

  for (const order of orders) {
    const analysis = analyzeDelay(order, 4, 7);
    if (analysis.isDelayed) {
      results.push({ orderId: order.id, analysis });
    }
  }

  return results;
}

export function formatDelayForCustomer(analysis: DelayAnalysis): string {
  return analysis.customerMessage;
}

export function formatDelayForAdmin(analysis: DelayAnalysis): string {
  let message = `**Delay Status:** ${analysis.status.toUpperCase()}\n\n`;
  message += `${analysis.internalNote}\n\n`;

  if (analysis.fulfillmentDate) {
    message += `**Shipped:** ${format(analysis.fulfillmentDate, 'MMM d, yyyy')}\n`;
  }

  if (analysis.expectedDeliveryDate) {
    message += `**Expected:** ${format(analysis.expectedDeliveryDate, 'MMM d, yyyy')}\n`;
  }

  message += `**Business Days Elapsed:** ${analysis.businessDaysElapsed}\n`;

  if (analysis.daysPastExpected > 0) {
    message += `**Days Delayed:** ${analysis.daysPastExpected}\n`;
  }

  if (analysis.trackingInfo) {
    message += `\n**Tracking:** ${analysis.trackingInfo.trackingNumber} (${analysis.trackingInfo.carrier})`;
  }

  return message;
}
