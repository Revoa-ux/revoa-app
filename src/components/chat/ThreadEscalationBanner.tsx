import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { resolveEscalation, getEscalationTypeLabel } from '@/lib/flowEscalationService';
import { toast } from '../../lib/toast';

interface ThreadEscalationBannerProps {
  threadId: string;
  onResolved?: () => void;
}

interface EscalationData {
  escalationType: string;
  escalatedAt: string;
  escalationContext: any;
  agentAcknowledged: boolean;
}

/**
 * Shows admins when a thread requires their action
 * Displays escalation details and allows marking as complete
 */
export const ThreadEscalationBanner: React.FC<ThreadEscalationBannerProps> = ({
  threadId,
  onResolved,
}) => {
  const [escalation, setEscalation] = useState<EscalationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadEscalation();

    // Subscribe to escalation changes
    const subscription = supabase
      .channel(`thread_escalation:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_threads',
          filter: `id=eq.${threadId}`,
        },
        () => {
          loadEscalation();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [threadId]);

  const loadEscalation = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('escalation_type, escalated_at, escalation_context, agent_acknowledged')
        .eq('id', threadId)
        .eq('requires_agent_action', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setEscalation({
          escalationType: data.escalation_type,
          escalatedAt: data.escalated_at,
          escalationContext: data.escalation_context,
          agentAcknowledged: data.agent_acknowledged,
        });
      } else {
        setEscalation(null);
      }
    } catch (error) {
      console.error('Error loading escalation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    try {
      setResolving(true);
      await resolveEscalation(threadId);
      toast.success('Escalation marked as resolved');
      setEscalation(null);
      onResolved?.();
    } catch (error) {
      console.error('Error resolving escalation:', error);
      toast.error('Failed to resolve escalation');
    } finally {
      setResolving(false);
    }
  };

  if (loading || !escalation) {
    return null;
  }

  const typeLabel = getEscalationTypeLabel(escalation.escalationType);
  const orderNumber = escalation.escalationContext?.order_number;
  const daysValue = escalation.escalationContext?.days_no_tracking ||
    escalation.escalationContext?.days_since_return;

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-l-4 border-red-500 dark:border-red-600 p-4 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0 mt-0.5">
            <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm" style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)' }}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: '#F43F5E',
                  boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                }}
              >
                <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-red-900 dark:text-red-100">
                Action Needed: {typeLabel}
              </h4>
              {!escalation.agentAcknowledged && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-500 text-white font-medium">
                  New
                </span>
              )}
            </div>

            <div className="text-sm text-red-800 dark:text-red-200 space-y-1">
              {orderNumber && (
                <p>
                  <span className="font-medium">Order:</span> #{orderNumber}
                </p>
              )}
              {daysValue && (
                <p>
                  <span className="font-medium">Duration:</span> {daysValue} days
                </p>
              )}
              <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                Escalated {new Date(escalation.escalatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            {resolving ? 'Resolving...' : 'Mark Complete'}
          </button>
        </div>
      </div>
    </div>
  );
};
