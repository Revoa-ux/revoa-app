import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getEscalationMessageForMerchant } from '@/lib/flowEscalationService';

interface FlowEscalationNoticeProps {
  threadId: string;
  escalationType?: string;
  escalationMessage?: string;
}

/**
 * Shows merchant that their agent has been notified and will take action
 * Provides confidence that the issue is being handled
 */
export const FlowEscalationNotice: React.FC<FlowEscalationNoticeProps> = ({
  threadId,
  escalationType,
  escalationMessage,
}) => {
  const [adminName, setAdminName] = useState<string>('Your support agent');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdminInfo = async () => {
      try {
        // Get the chat and admin info
        const { data: threadData } = await supabase
          .from('chat_threads')
          .select(`
            chat:chats!inner(
              admin_id,
              admin:user_profiles!chats_admin_id_fkey(name)
            )
          `)
          .eq('id', threadId)
          .maybeSingle();

        if (threadData?.chat?.admin?.name) {
          setAdminName(threadData.chat.admin.name);
        }
      } catch (error) {
        console.error('Error loading admin info:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdminInfo();
  }, [threadId]);

  if (loading) {
    return null; // Don't show anything while loading
  }

  const message = escalationMessage ||
    (escalationType ? getEscalationMessageForMerchant(escalationType, undefined, adminName) : null);

  if (!message) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {adminName} has been notified
            </h4>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {message}
          </p>

          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 pt-1">
            <AlertCircle className="w-4 h-4" />
            <span>
              You'll receive an update within 24 hours. No further action needed from you.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
