import React, { useState, useRef } from 'react';
import { Hash, Plus } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import { cn } from '@/lib/utils';
import { ChannelThread } from './ChannelTabs';

interface ChannelDropdownProps {
  threads: ChannelThread[];
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string | null) => void;
  onCreateThread: () => void;
}

const TAG_COLORS = {
  return: 'bg-red-500/10 text-red-600 dark:text-red-400',
  replacement: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  damaged: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  defective: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

const TAG_LABELS = {
  return: 'Return',
  replacement: 'Replacement',
  damaged: 'Damaged',
  defective: 'Defective',
};

export const ChannelDropdown: React.FC<ChannelDropdownProps> = ({
  threads,
  selectedThreadId,
}) => {
  const selectedThread = threads.find(t => t.id === selectedThreadId);

  const getCurrentLabel = () => {
    if (!selectedThreadId) {
      return 'main-chat';
    }
    const orderNumber = selectedThread?.order_number || selectedThread?.order_id.slice(0, 8);
    // Remove leading # if present since we show Hash icon
    return orderNumber.replace(/^#/, '');
  };

  const getCurrentSubtitle = () => {
    if (!selectedThreadId) {
      return 'General conversation';
    }
    return selectedThread?.customer_name || 'Guest Customer';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
      <Hash className="w-4 h-4 flex-shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="truncate">{getCurrentLabel()}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{getCurrentSubtitle()}</span>
      </div>
    </div>
  );
};
