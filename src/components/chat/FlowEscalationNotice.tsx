import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getEscalationMessageForMerchant } from '@/lib/flowEscalationService';

interface FlowEscalationNoticeProps {
  threadId: string;
  escalationType?: string;
  escalationMessage?: string;
}

interface AdminInfo {
  name: string;
  profilePictureUrl?: string;
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
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
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
              admin:user_profiles!chats_admin_id_fkey(
                name,
                first_name,
                last_name,
                profile_picture_url
              )
            )
          `)
          .eq('id', threadId)
          .maybeSingle();

        if (threadData?.chat?.admin) {
          const admin = threadData.chat.admin;
          const name = admin.name ||
            (admin.first_name && admin.last_name ? `${admin.first_name} ${admin.last_name}` : null) ||
            'Your support agent';

          setAdminInfo({
            name,
            profilePictureUrl: admin.profile_picture_url
          });
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
    return null;
  }

  const adminName = adminInfo?.name || 'Your support agent';
  const message = escalationMessage ||
    (escalationType ? getEscalationMessageForMerchant(escalationType, undefined, adminName) : null);

  if (!message) {
    return null;
  }

  return (
    <div className="flex justify-start my-3">
      <div className="flex items-start gap-3 max-w-[85%] lg:max-w-[75%] xl:max-w-[65%]">
        {/* Admin Profile Picture - only show if we have one */}
        {adminInfo?.profilePictureUrl && (
          <div className="flex-shrink-0 mt-1">
            <img
              src={adminInfo.profilePictureUrl}
              alt={adminName}
              className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 dark:border-[#3a3a3a]"
            />
          </div>
        )}

        {/* Message Bubble */}
        <div className="message-bubble-team bg-gray-100 dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg">
          <div className="px-3 pt-2 pb-1.5">
            {/* Header with checkmark */}
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-[#f3405f] dark:text-[#f3405f] flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {adminName} has been notified
              </span>
            </div>

            {/* Main message */}
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              {message}
            </p>

            {/* Footer info */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-[#3a3a3a]/50 mt-2">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>You'll receive an update within 24 hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
