import React, { useState, useRef } from 'react';
import { Paperclip, Smile, Clock, Send } from 'lucide-react';
import { Message } from '@/types/chat';
import { useTypingStore } from '@/lib/chat/typing';
import { FileUploadModal } from './FileUploadModal';
import { EmojiPicker } from './EmojiPicker';
import { ScheduleMessageModal } from './ScheduleMessageModal';
import { read, utils } from 'xlsx';

interface ChatInputProps {
  onSendMessage: (content: string, type?: Message['type']) => void;
  onSendFile: (file: File, messageText?: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendFile
}) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const setTyping = useTypingStore(state => state.setTyping);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      onSendMessage(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '24px';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);

    try {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Read Excel file
        const data = await file.arrayBuffer();
        const workbook = read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json(worksheet);

        // Send file message with invoice type
        onSendMessage(file.name, 'invoice');
        onSendFile(file);
      } else {
        // Handle other file types
        await onSendFile(file);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsProcessing(false);
      setShowUploadModal(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setTyping(true);
    
    // Auto-resize textarea with consistent heights
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px'; // Reset to initial height
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`; // Cap at max height
    }
    
    // Clear typing indicator after delay
    setTimeout(() => setTyping(false), 1000);
  };

  return (
    <div className="px-4 py-4 border-t border-gray-200 dark:border-[#3a3a3a]">
      <form onSubmit={handleSubmit}>
        <div className="relative bg-gray-50 dark:bg-[#3a3a3a] rounded-xl border-0 outline-none ring-0 focus-within:outline-none focus-within:ring-0 focus-within:border-0" style={{ border: 'none', outline: 'none', boxShadow: 'none' }}>
          <div className="min-h-[44px] p-3">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTyping}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="w-full min-h-[24px] max-h-[120px] text-sm bg-transparent dark:text-white focus:outline-none focus:ring-0 focus:border-0 resize-none placeholder-gray-400 dark:placeholder-gray-500"
              style={{
                height: '24px',
                overflowY: 'hidden',
                border: 'none',
                outline: 'none',
                boxShadow: 'none'
              }}
              disabled={isProcessing}
            />
            
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors"
                  disabled={isProcessing}
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  ref={emojiButtonRef}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors relative"
                  disabled={isProcessing}
                >
                  <Smile className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors"
                  disabled={isProcessing}
                >
                  <Clock className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={!message.trim() || isProcessing}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {showUploadModal && (
        <FileUploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleFileUpload}
        />
      )}

      {showEmojiPicker && (
        <div className="relative">
          <EmojiPicker
            onSelect={(emoji) => {
              setMessage(prev => prev + emoji);
              setShowEmojiPicker(false);
            }}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {showScheduleModal && (
        <ScheduleMessageModal
          message={message}
          onClose={() => setShowScheduleModal(false)}
          onSchedule={(scheduledTime) => {
            setShowScheduleModal(false);
            setMessage('');
          }}
        />
      )}
    </div>
  );
};