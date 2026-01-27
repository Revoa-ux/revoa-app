import React from 'react';
import { Message } from '@/types/chat';
import { MessageSquare } from 'lucide-react';

interface SearchResultsProps {
  results: Message[];
  onMessageClick: (messageId: string) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onMessageClick
}) => {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">No messages found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((message) => (
        <button
          key={message.id}
          onClick={() => onMessageClick(message.id)}
          className="w-full p-4 text-left bg-white dark:bg-dark hover:bg-gray-50 dark:hover:bg-[#3a3a3a] border border-gray-200 dark:border-[#3a3a3a] rounded-lg transition-colors"
        >
          <div className="flex items-start space-x-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-900 dark:text-white capitalize">
                  {message.sender}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {message.content}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};