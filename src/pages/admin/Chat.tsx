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
  Image as ImageIcon,
  User
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

const AdminChat = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatType[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
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
  const [isLoading, setIsLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useClickOutside(moreMenuRef, () => setShowMoreMenu(false));

  useEffect(() => {
    if (!user) return;

    const loadChats = async () => {
      setIsLoading(true);
      const adminChats = await chatService.getAdminChats(user.id);
      setChats(adminChats);
      if (adminChats.length > 0) {
        setSelectedChat(adminChats[0]);
      }
      setIsLoading(false);
    };

    loadChats();
  }, [user]);

  useEffect(() => {
    if (!selectedChat) return;

    const loadMessages = async () => {
      const msgs = await chatService.getChatMessages(selectedChat.id);
      setMessages(msgs);
      await chatService.markMessagesAsRead(selectedChat.id, true);
    };

    loadMessages();
  }, [selectedChat]);

  useEffect(() => {
    if (!selectedChat) return;

    const channel = chatService.subscribeToMessages(selectedChat.id, (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
      if (newMessage.sender === 'user') {
        setIsTyping(false);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [selectedChat]);

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

    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    if (!selectedChat) {
      toast.error('No chat selected');
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
      sender: 'team',
      timestamp: new Date(),
      status: 'sending',
      statusTimeline: {
        sent: new Date()
      }
    };

    setMessages([...messages, tempMessage]);

    const savedMessage = await chatService.sendMessage(
      selectedChat.id,
      messageText,
      'text',
      'team'
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
    if (!selectedChat || !user) {
      toast.error('No chat selected');
      return;
    }

    try {
      toast.info('Uploading file...');

      const savedMessage = await chatService.sendFileMessage(
        selectedChat.id,
        file,
        'team',
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
    const messageEl = messageRefs.current[messageId];
    if (messageEl) {
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
      setShowSearchModal(false);
    }
  };

  const userName = selectedChat?.user_profile?.name || 'User';
  const userEmail = selectedChat?.user_profile?.email || '';

  return (
    <div className="p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
            Conversations
          </h1>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{chats.length} active chats</p>
          </div>
        </div>

        <div className="flex h-[calc(100vh-14rem)] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Conversations List */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col rounded-l-xl overflow-hidden">
            <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-gray-200 dark:border-gray-700 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <MessageSquare className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No conversations yet</p>
            </div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`w-full p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left ${
                  selectedChat?.id === chat.id ? 'bg-gray-50 dark:bg-gray-700' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {chat.user_profile?.name || 'User'}
                      </h3>
                      {chat.unread_count_admin > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                          {chat.unread_count_admin}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {chat.user_profile?.email}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">{userName}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{userEmail}</p>
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
                      <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center">
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </button>
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                      >
                        {isMuted ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
                        {isMuted ? 'Unmute' : 'Mute'}
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center">
                        <Flag className="w-4 h-4 mr-2" />
                        Flag
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900/50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">No messages yet</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Start a conversation with this user</p>
                  </div>
                </div>
              ) : null}
              {messages.map((message) => (
                <div
                  key={message.id}
                  ref={el => messageRefs.current[message.id] = el}
                  className={`flex ${message.sender === 'team' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] break-words ${
                    message.sender === 'team'
                      ? 'message-bubble-user text-white'
                      : 'message-bubble-team text-gray-900'
                  } rounded-lg px-4 py-2`}>
                    {message.type === 'image' && message.fileUrl ? (
                      <div className="space-y-2">
                        <img
                          src={message.fileUrl}
                          alt={message.fileName || 'Uploaded image'}
                          className="max-w-full h-auto rounded-lg"
                        />
                        <p className="text-sm">{message.content}</p>
                      </div>
                    ) : message.type === 'file' && message.fileUrl ? (
                      <div className="flex items-center space-x-2 bg-white dark:bg-gray-800/10 rounded-lg p-2">
                        <FileText className="w-5 h-5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{message.fileName}</p>
                          <p className="text-xs opacity-80">
                            {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : ''}
                          </p>
                        </div>
                        <a
                          href={message.fileUrl}
                          download={message.fileName}
                          className="p-1 hover:bg-white dark:bg-gray-800/20 rounded transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="message-bubble-team text-gray-900 dark:text-gray-100 rounded-lg px-4 py-2">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="relative bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div className="min-h-[44px] p-3">
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    className="w-full min-h-[24px] max-h-[120px] text-sm text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none resize-none placeholder-gray-400 dark:placeholder-gray-500"
                    style={{
                      height: '24px',
                      overflowY: 'hidden'
                    }}
                  />

                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
                      className="p-2 rounded-lg transition-all disabled:opacity-50 hover:bg-gray-100 flex items-center justify-center"
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
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900/50">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No conversation selected</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose a conversation from the list to start chatting</p>
            </div>
          </div>
        )}
      </div>
        </div>

        {showUploadModal && (
          <FileUploadModal
            onClose={() => setShowUploadModal(false)}
            onUpload={handleFileUpload}
          />
        )}

        {showSearchModal && (
          <Modal
            isOpen={showSearchModal}
            onClose={() => setShowSearchModal(false)}
            title="Search Messages"
          >
            <div className="space-y-4">
              <MessageSearch
                messages={messages}
                onSearch={handleSearchMessages}
                isSearching={isSearching}
                filters={searchFilters}
                onFiltersChange={setSearchFilters}
              />
              {searchResults.length > 0 && (
                <SearchResults
                  results={searchResults}
                  onMessageClick={handleMessageClick}
                  highlightedMessageId={highlightedMessageId}
                />
              )}
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default AdminChat;
