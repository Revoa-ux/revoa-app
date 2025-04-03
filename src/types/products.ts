export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  itemCost: number;
  shippingCost: number;
  recommendedPrice: number;
  images: string[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  createdBy: string;
  createdAt: string;
  variants: ProductVariant[];
  metadata?: Record<string, any>;
}

export type SortField = 
  | 'name'
  | 'category'
  | 'approvalStatus'
  | 'createdAt'
  | 'approvedAt';

export type SortDirection = 'asc' | 'desc';

export interface ProductFilters {
  category?: string;
  approvalStatus?: Product['approvalStatus'];
  createdBy?: string;
  approvedBy?: string;
}

export interface ApprovalHistoryEntry {
  id: string;
  productId: string;
  status: Product['approvalStatus'];
  reviewedBy: string;
  reviewedAt: string;
  comments?: string;
  metadata?: Record<string, any>;
}

export interface ProductNotification {
  id: string;
  type: 'product_approval';
  title: string;
  message: string;
  read: boolean;
  metadata: {
    productId: string;
    productName: string;
    submittedBy: string;
  };
  createdAt: string;
}