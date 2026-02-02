export interface Invoice {
  id: string;
  date: string;
  invoice_number: string;
  product_cost: number;
  shipping_cost: number;
  total_cost: number;
  status: 'pending' | 'paid' | 'unpaid';
  payment_link?: string;
  wise_pay_link?: string;
  file_url: string;
  invoice_type?: 'auto_generated' | 'purchase_order' | 'manual';
}

export interface Transaction {
  id: string;
  date: string;
  type: 'payment' | 'refund' | 'adjustment' | 'top_up';
  amount: number;
  payment_method: string;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
}

export interface ShopifyReturn {
  id: string;
  user_id: string;
  shopify_order_id: string;
  shopify_return_id: string;
  return_amount: number;
  return_reason?: string;
  returned_at: string;
  refund_line_items?: Array<{
    quantity: number;
    title: string;
    sku: string | null;
    amount: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface Column<T> {
  id: keyof T;
  label: string;
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}