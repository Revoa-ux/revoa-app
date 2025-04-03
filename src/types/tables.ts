export interface Invoice {
  id: string;
  date: string;
  invoice_number: string;
  product_cost: number;
  shipping_cost: number;
  total_cost: number;
  status: 'paid' | 'unpaid' | 'pending';
  payment_link?: string;
  file_url?: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'payment' | 'refund' | 'adjustment' | 'top_up';
  amount: number;
  payment_method: 'card' | 'bank_transfer' | 'paypal';
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
}

export interface Column<T> {
  id: keyof T;
  label: string;
  width: number;
  minWidth: number;
  sortable?: boolean;
  fixed?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}