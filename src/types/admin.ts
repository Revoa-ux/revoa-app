import { User } from '@supabase/supabase-js';

export type AdminRole = 'admin' | 'super_admin';

export interface AdminUser {
  id: string;
  userId: string;
  role: AdminRole;
  email: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  assignedUsersCount: number;
  avgResponseTime?: string;
  totalTransactionVolume: number;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface UserAssignment {
  id: string;
  userId: string;
  adminId: string;
  assignedAt: string;
  totalTransactions: number;
  totalInvoices: number;
  lastInteractionAt?: string;
  metadata?: Record<string, any>;
}

export interface AdminActivityLog {
  id: string;
  adminId: string;
  actionType: string;
  actionDetails: Record<string, any>;
  responseTime?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  registrationDate: string;
  transactionCount: number;
  invoiceCount: number;
  totalVolume: number;
  assignedAdmin?: AdminUser;
  metadata?: Record<string, any>;
}

export interface AdminMetrics {
  responseTime: {
    average: string;
    trend: number;
  };
  userLoad: {
    current: number;
    trend: number;
  };
  transactionVolume: {
    total: number;
    trend: number;
  };
  performance: {
    score: number;
    trend: number;
  };
}

export interface AdminPermissions {
  canManageUsers: boolean;
  canManageAdmins: boolean;
  canManageSettings: boolean;
  canViewMetrics: boolean;
  canAssignUsers: boolean;
  canProcessQuotes: boolean;
  canManageProducts: boolean;
  canManageInvoices: boolean;
}