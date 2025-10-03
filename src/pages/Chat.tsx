import React, { useState, useEffect, useRef } from 'react';
import {
  Archive,
  Flag,
  Volume2,
  VolumeX,
  Trash2,
  Download,
  MessageSquare,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import { Message } from '@/types/chat';
import { useClickOutside } from '@/lib/useClickOutside';
import { useAuth } from '@/contexts/AuthContext';
import { chatService, Chat as ChatType } from '@/lib/chatService';
import { FileUploadModal } from '@/components/chat/FileUploadModal';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { MessageSearch } from '@/components/chat/MessageSearch';
import { SearchResults } from '@/components/chat/SearchResults';

const Chat = () => {
  const { user } = useAuth();
  const [chat, setChat] = useState<ChatType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminName, setAdminName] = useState('Revoa Fulfillment Team');
  const [adminAvatar, setAdminAvatar] = useState('https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png');
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchFilters, setSearchFilters] = useState({
    type: 'all' as 'all' | 'text' | 'image' | 'file' | 'link',
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month'
  });
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useClickOutside(moreMenuRef, () => setShowMoreMenu(false));

  useEffect(() => {
    if (!user) return;

    const loadChat = async () => {
      setIsLoading(true);
      try {
        const userChat = await chatService.getUserChat(user.id);
        if (userChat) {
          setChat(userChat);
          if (userChat.admin_profile) {
            setAdminName(userChat.admin_profile.name || 'Revoa Fulfillment Team');
          }
          const msgs = await chatService.getChatMessages(userChat.id);
          setMessages(msgs);
          await chatService.markMessagesAsRead(userChat.id, false);
        } else {
          toast.error('Unable to initialize chat. Please contact support.');
        }
      } catch (error) {
        console.error('Error loading chat:', error);
        toast.error('Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    };

    loadChat();
  }, [user]);

  useEffect(() => {
    if (!chat) return;

    const channel = chatService.subscribeToMessages(chat.id, (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
      if (newMessage.sender === 'team') {
        setIsTyping(false);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [chat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    // Auto-resize textarea with consistent heights
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px'; // Reset to initial height
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`; // Cap at max height
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!chat) {
      toast.error('Chat not initialized');
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
    }

    const tempMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      type: 'text',
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
      statusTimeline: {
        sent: new Date()
      }
    };

    setMessages([...messages, tempMessage]);

    const savedMessage = await chatService.sendMessage(
      chat.id,
      messageText,
      'text',
      'user'
    );

    if (savedMessage) {
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessage.id ? savedMessage : msg
      ));
    } else {
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!chat || !user) {
      toast.error('Chat not initialized');
      return;
    }

    try {
      toast.info('Uploading file...');

      const savedMessage = await chatService.sendFileMessage(
        chat.id,
        file,
        'user',
        user.id
      );

      if (savedMessage) {
        setMessages(prev => [...prev, savedMessage]);
        setShowUploadModal(false);
        toast.success('File sent successfully');
      } else {
        toast.error('Failed to send file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to send file');
    }
  };

  const handleSearchMessages = (query: string) => {
    setIsSearching(true);
    const results = messages.filter(message => 
      message.content.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleMessageClick = (messageId: string) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
      setShowSearchModal(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Supplier Chat
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Chat with your suppliers in real-time</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 h-[calc(100vh-7.6rem)] flex flex-col mt-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
              <img
                src={adminAvatar}
                alt={adminName}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-base font-medium text-gray-900 dark:text-white">{adminName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Online</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowSearchModal(true)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <div className="relative" ref={moreMenuRef}>
              <button 
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={() => {
                      setIsMuted(!isMuted);
                      setShowMoreMenu(false);
                      toast.success(isMuted ? 'Notifications unmuted' : 'Notifications muted');
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {isMuted ? (
                      <>
                        <VolumeX className="w-4 h-4 mr-3" />
                        Unmute Notifications
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 mr-3" />
                        Mute Notifications
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      toast.success('Chat archived');
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Archive className="w-4 h-4 mr-3" />
                    Archive Chat
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      toast.success('Report submitted');
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Flag className="w-4 h-4 mr-3" />
                    Report Issue
                  </button>
                  <div className="h-px bg-gray-200 dark:bg-gray-700 mx-3 my-1"></div>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      toast.success('Chat history exported');
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Download className="w-4 h-4 mr-3" />
                    Export Chat
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all messages? This cannot be undone.')) {
                        setMessages([]);
                        setShowMoreMenu(false);
                        toast.success('Chat cleared');
                      }
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 mr-3" />
                    Clear Messages
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading chat...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No messages yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Start a conversation with your assigned admin</p>
              </div>
            </div>
          ) : null}
          {!isLoading && messages.map((message) => (
            <div
              key={message.id}
              ref={el => messageRefs.current[message.id] = el}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] break-words ${
                message.sender === 'user'
                  ? 'message-bubble-user text-white'
                  : 'message-bubble-team text-gray-900 dark:text-white'
              } rounded-lg px-4 py-2`}>
                {message.type === 'image' && message.fileUrl ? (
                  <div className="space-y-2">
                    <img
                      src={message.fileUrl}
                      alt={message.fileName || 'Uploaded image'}
                      className="max-w-full rounded-lg max-h-64 object-cover"
                    />
                    <p className="text-sm">{message.fileName}</p>
                  </div>
                ) : message.type === 'file' && message.fileUrl ? (
                  <a
                    href={message.fileUrl}
                    download={message.fileName}
                    className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                  >
                    <div className={`p-2 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-white/20'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{message.fileName}</p>
                      {message.fileSize && (
                        <p className={`text-xs ${
                          message.sender === 'user' ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {(message.fileSize / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>
                    <Download className="w-4 h-4 flex-shrink-0" />
                  </a>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
                <div className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-end space-x-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
                <img 
                  src="https://jfwmnaaujzuwrqqhgmuf.supabase.co/storage/v1/object/public/REVOA%20(Public)//REVOA%20Favicon%20Circle.png"
                  alt="Revoa Team"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="message-bubble message-bubble-team px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="relative bg-gray-50 dark:bg-gray-700 rounded-xl">
            <div className="min-h-[44px] p-3">
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={handleTyping}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                className="w-full min-h-[24px] max-h-[120px] text-sm bg-transparent dark:text-white focus:outline-none resize-none placeholder-gray-400 dark:placeholder-gray-500"
                style={{
                  height: '24px',
                  overflowY: 'hidden'
                }}
              />
              
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-full right-0 mb-2">
                        <EmojiPicker
                          onSelect={(emoji) => {
                            setNewMessage(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim()}
                  className="p-2 rounded-lg transition-all disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-center"
                >
                  {newMessage.trim() ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="sendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="rgb(239, 68, 68)" />
                          <stop offset="100%" stopColor="rgb(219, 39, 119)" />
                        </linearGradient>
                      </defs>
                      <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="url(#sendGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <Send className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSearchModal && (
        <Modal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          title="Search Messages"
        >
          <div className="space-y-4">
            <MessageSearch
              messages={messages}
              onSearchResult={setSearchResults}
            />

            <div className="mt-6">
              {searchResults.length > 0 ? (
                <SearchResults
                  results={searchResults}
                  onMessageClick={(messageId) => {
                    const messageElement = messageRefs.current[messageId];
                    if (messageElement) {
                      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setHighlightedMessageId(messageId);
                      setTimeout(() => setHighlightedMessageId(null), 2000);
                    }
                    setShowSearchModal(false);
                  }}
                />
              ) : searchQuery && !isSearching ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No messages found</p>
                </div>
              ) : null}
            </div>
          </div>
        </Modal>
      )}

      {showUploadModal && (
        <FileUploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleFileUpload}
        />
      )}
    </div>
  );
};

export default Chat;