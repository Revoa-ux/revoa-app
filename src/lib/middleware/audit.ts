import { supabase } from '../supabase';
import { handleError } from '../errorTracking';

interface AuditLogEntry {
  user_id: string;
  action: string;
  resource: string;
  details?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  ip_address?: string;
  user_agent?: string;
}

export class AuditLogger {
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('auth_audit_logs')
        .insert([{
          ...entry,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      handleError(error);
      // Don't throw - logging should not break the flow
      console.error('Failed to create audit log:', error);
    }
  }

  static async getAuditLogs(userId: string, options: {
    startDate?: Date;
    endDate?: Date;
    action?: string;
    resource?: string;
    limit?: number;
  } = {}): Promise<any[]> {
    try {
      let query = supabase
        .from('auth_audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }
      if (options.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }
      if (options.action) {
        query = query.eq('action', options.action);
      }
      if (options.resource) {
        query = query.eq('resource', options.resource);
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      handleError(error);
      return [];
    }
  }
}