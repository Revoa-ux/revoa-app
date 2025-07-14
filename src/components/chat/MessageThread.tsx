import React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { Message, MessageThread as ThreadType } from '@/types/chat'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { MessageStatus } from './MessageStatus';
import { MessageReactions } from './MessageReactions';
import { ReadReceipt } from './ReadReceipt';

interface MessageThreadProps {
  thread: ThreadType;
  onClose: () => void;
  onReply: (content: string) => void;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  thread,
  onClose,
  onReply
}) => {
  const [replyContent, setReplyContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    onReply(replyContent);
    setReplyContent('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">
            Thread ({thread.messages.length})
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {thread.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] break-words ${
              message.sender === 'user'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-900'
            } rounded-lg px-4 py-2`}>
              <p className="text-sm">{message.content}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs opacity-75">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
                {message.sender === 'user' && ( // eslint-disable-line @typescript-eslint/no-unused-vars
                  <ReadReceipt status={message.status} />
                )}
              </div>
              <MessageReactions messageId={message.id} />
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Reply to thread..."
            className="flex-1 px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!replyContent.trim()}
            className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Reply
          </button>
        </form>
      </div>
    </div>
  );
};