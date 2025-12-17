import { supabase } from './supabase';
import { differenceInDays, addDays, isPast, isFuture, format } from 'date-fns';

export interface WarrantyInfo {
  warrantyDays: number;
  orderDate: Date;
  expiryDate: Date;
  status: 'active' | 'expired' | 'expiring_soon' | 'none';
  daysRemaining: number;
  coversDamagedItems: boolean;
  coversLostItems: boolean;
  coversLateShipment: boolean;
}

export interface OrderWarrantyStatus {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  items: Array<{
    productName: string;
    variantTitle?: string;
    warranty: WarrantyInfo;
  }>;
  hasActiveWarranty: boolean;
  hasExpiredWarranty: boolean;
}

export interface FlowWarrantyContext {
  hasOrder: boolean;
  orderWarrantyStatus?: 'active' | 'expired' | 'mixed' | 'none';
  warrantyExpiryDate?: string;
  productCoverages?: {
    damaged: boolean;
    lost: boolean;
    late: boolean;
  };
  orderAgeInDays?: number;
}

/**
 * Calculate warranty expiry date
 */
export function calculateWarrantyExpiry(orderDate: Date, warrantyDays: number): Date {
  return addDays(orderDate, warrantyDays);
}

/**
 * Check if order is within warranty period
 */
export function isWithinWarranty(orderDate: Date, warrantyDays: number): boolean {
  if (warrantyDays === 0) return false;

  const expiryDate = calculateWarrantyExpiry(orderDate, warrantyDays);
  return isFuture(expiryDate) || format(expiryDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
}

/**
 * Get warranty days remaining (negative if expired)
 */
export function getWarrantyDaysRemaining(orderDate: Date, warrantyDays: number): number {
  const expiryDate = calculateWarrantyExpiry(orderDate, warrantyDays);
  return differenceInDays(expiryDate, new Date());
}

/**
 * Get warranty status for display
 */
export function getWarrantyStatus(orderDate: Date, warrantyDays: number): 'active' | 'expired' | 'expiring_soon' | 'none' {
  if (warrantyDays === 0) return 'none';

  const daysRemaining = getWarrantyDaysRemaining(orderDate, warrantyDays);

  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 7) return 'expiring_soon';
  return 'active';
}

/**
 * Get warranty information for a specific warranty period
 */
export function getWarrantyInfo(
  orderDate: Date,
  warrantyDays: number,
  coversDamagedItems: boolean = false,
  coversLostItems: boolean = false,
  coversLateShipment: boolean = false
): WarrantyInfo {
  const expiryDate = calculateWarrantyExpiry(orderDate, warrantyDays);
  const daysRemaining = getWarrantyDaysRemaining(orderDate, warrantyDays);
  const status = getWarrantyStatus(orderDate, warrantyDays);

  return {
    warrantyDays,
    orderDate,
    expiryDate,
    status,
    daysRemaining,
    coversDamagedItems,
    coversLostItems,
    coversLateShipment,
  };
}

/**
 * Get warranty status for an entire order
 */
export async function getOrderWarrantyStatus(orderId: string): Promise<OrderWarrantyStatus | null> {
  try {
    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('shopify_orders')
      .select('id, order_number, order_date')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return null;

    // Get line items with their product quotes (which contain warranty info)
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('shopify_order_line_items')
      .select(`
        id,
        product_name,
        variant_title,
        product_quotes (
          warranty_days,
          covers_damaged_items,
          covers_lost_items,
          covers_late_shipment
        )
      `)
      .eq('order_id', orderId);

    if (lineItemsError) throw lineItemsError;
    if (!lineItems || lineItems.length === 0) return null;

    const orderDate = new Date(order.order_date);
    const items = lineItems.map(item => {
      // Get warranty info from product quote
      const quote = Array.isArray(item.product_quotes) ? item.product_quotes[0] : item.product_quotes;
      const warrantyDays = quote?.warranty_days || 0;
      const coversDamagedItems = quote?.covers_damaged_items || false;
      const coversLostItems = quote?.covers_lost_items || false;
      const coversLateShipment = quote?.covers_late_shipment || false;

      return {
        productName: item.product_name,
        variantTitle: item.variant_title || undefined,
        warranty: getWarrantyInfo(
          orderDate,
          warrantyDays,
          coversDamagedItems,
          coversLostItems,
          coversLateShipment
        ),
      };
    });

    const hasActiveWarranty = items.some(item =>
      item.warranty.status === 'active' || item.warranty.status === 'expiring_soon'
    );
    const hasExpiredWarranty = items.some(item => item.warranty.status === 'expired');

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      orderDate,
      items,
      hasActiveWarranty,
      hasExpiredWarranty,
    };
  } catch (error) {
    console.error('Error fetching order warranty status:', error);
    return null;
  }
}

/**
 * Get warranty context for conversational flows
 */
export async function getFlowWarrantyContext(orderId?: string): Promise<FlowWarrantyContext> {
  if (!orderId) {
    return {
      hasOrder: false,
    };
  }

  const orderStatus = await getOrderWarrantyStatus(orderId);

  if (!orderStatus) {
    return {
      hasOrder: false,
    };
  }

  // Determine overall warranty status
  let warrantyStatus: 'active' | 'expired' | 'mixed' | 'none';
  if (orderStatus.hasActiveWarranty && orderStatus.hasExpiredWarranty) {
    warrantyStatus = 'mixed';
  } else if (orderStatus.hasActiveWarranty) {
    warrantyStatus = 'active';
  } else if (orderStatus.hasExpiredWarranty) {
    warrantyStatus = 'expired';
  } else {
    warrantyStatus = 'none';
  }

  // Get the earliest expiry date among active warranties
  const activeWarranties = orderStatus.items
    .filter(item => item.warranty.status === 'active' || item.warranty.status === 'expiring_soon')
    .map(item => item.warranty);

  const warrantyExpiryDate = activeWarranties.length > 0
    ? format(
        activeWarranties.reduce((earliest, w) =>
          w.expiryDate < earliest ? w.expiryDate : earliest
        , activeWarranties[0].expiryDate),
        'MMM d, yyyy'
      )
    : undefined;

  // Aggregate coverage across all items
  const productCoverages = {
    damaged: orderStatus.items.some(item => item.warranty.coversDamagedItems),
    lost: orderStatus.items.some(item => item.warranty.coversLostItems),
    late: orderStatus.items.some(item => item.warranty.coversLateShipment),
  };

  const orderAgeInDays = differenceInDays(new Date(), orderStatus.orderDate);

  return {
    hasOrder: true,
    orderWarrantyStatus: warrantyStatus,
    warrantyExpiryDate,
    productCoverages,
    orderAgeInDays,
  };
}

/**
 * Format warranty status for display
 */
export function formatWarrantyStatus(warranty: WarrantyInfo): {
  badge: { text: string; color: string };
  message: string;
} {
  switch (warranty.status) {
    case 'active':
      return {
        badge: { text: 'Active', color: 'green' },
        message: `Valid until ${format(warranty.expiryDate, 'MMM d, yyyy')} (${warranty.daysRemaining} days remaining)`,
      };
    case 'expiring_soon':
      return {
        badge: { text: 'Expiring Soon', color: 'yellow' },
        message: `Expires ${format(warranty.expiryDate, 'MMM d, yyyy')} (${warranty.daysRemaining} days remaining)`,
      };
    case 'expired':
      return {
        badge: { text: 'Expired', color: 'red' },
        message: `Expired ${format(warranty.expiryDate, 'MMM d, yyyy')} (${Math.abs(warranty.daysRemaining)} days ago)`,
      };
    case 'none':
      return {
        badge: { text: 'No Warranty', color: 'gray' },
        message: 'This product does not include warranty coverage',
      };
  }
}

/**
 * Get coverage description for display
 */
export function getCoverageDescription(warranty: WarrantyInfo): string {
  const coverages: string[] = [];

  if (warranty.coversDamagedItems) coverages.push('Damaged Items');
  if (warranty.coversLostItems) coverages.push('Lost Items');
  if (warranty.coversLateShipment) coverages.push('Late Shipment');

  if (coverages.length === 0) return 'No coverage';
  if (coverages.length === 1) return coverages[0];
  if (coverages.length === 2) return `${coverages[0]} and ${coverages[1]}`;

  return `${coverages.slice(0, -1).join(', ')}, and ${coverages[coverages.length - 1]}`;
}
