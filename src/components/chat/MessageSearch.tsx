import React from 'react';
import { Search, X } from 'lucide-react'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { Message } from '@/types/chat';

interface MessageSearchProps {
  messages: Message[];
  onSearchResult: (messages: Message[]) => void;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({
  messages,
  onSearchResult
}) => {
  // Handle search input change with real-time results
  const handleSearchChange = (value: string) => {
    if (!value.trim()) {
      onSearchResult([]);
      return;
    }

    // Search messages in real-time
    const results = messages.filter(message => 
      message.content.toLowerCase().includes(value.toLowerCase())
    );
    
    onSearchResult(results);
  };

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        type="text"
        placeholder="Search messages..."
        onChange={(e) => handleSearchChange(e.target.value)}
        className="w-full pl-10 pr-10 py-2 text-sm bg-gray-100 dark:bg-[#3a3a3a] text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
    </div>
  );
};