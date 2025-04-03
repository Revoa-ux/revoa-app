import { Message } from '@/types/chat';

interface SearchOptions {
  query: string;
  filters?: {
    type?: Message['type'][];
    sender?: Message['sender'][];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export const searchMessages = (messages: Message[], options: SearchOptions): Message[] => {
  const { query, filters } = options;
  const searchTerms = query.toLowerCase().split(' ');

  return messages.filter(message => {
    // Check search terms
    const matchesSearch = searchTerms.every(term =>
      message.content.toLowerCase().includes(term) ||
      message.metadata?.fileName?.toLowerCase().includes(term)
    );

    if (!matchesSearch) return false;

    // Apply filters
    if (filters) {
      // Filter by type
      if (filters.type?.length && !filters.type.includes(message.type)) {
        return false;
      }

      // Filter by sender
      if (filters.sender?.length && !filters.sender.includes(message.sender)) {
        return false;
      }

      // Filter by date range
      if (filters.dateRange) {
        const messageDate = new Date(message.timestamp);
        if (
          messageDate < filters.dateRange.start ||
          messageDate > filters.dateRange.end
        ) {
          return false;
        }
      }
    }

    return true;
  });
};

// Highlight search matches in text
export const highlightMatches = (text: string, query: string): string => {
  if (!query) return text;

  const searchTerms = query.toLowerCase().split(' ');
  let highlightedText = text;

  searchTerms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlightedText = highlightedText.replace(
      regex,
      '<mark class="bg-yellow-200 rounded">$1</mark>'
    );
  });

  return highlightedText;
};

// Get message context (messages before and after)
export const getMessageContext = (
  messages: Message[],
  messageId: string,
  contextSize: number = 3
): Message[] => {
  const index = messages.findIndex(m => m.id === messageId);
  if (index === -1) return [];

  const start = Math.max(0, index - contextSize);
  const end = Math.min(messages.length, index + contextSize + 1);

  return messages.slice(start, end);
};

// Group messages by date
export const groupMessagesByDate = (messages: Message[]): Record<string, Message[]> => {
  return messages.reduce((groups, message) => {
    const date = new Date(message.timestamp).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);
};

// Get unique file types in messages
export const getUniqueFileTypes = (messages: Message[]): string[] => {
  const types = new Set<string>();
  messages.forEach(message => {
    if (message.type === 'file' && message.metadata?.fileType) {
      types.add(message.metadata.fileType as string);
    }
  });
  return Array.from(types);
};