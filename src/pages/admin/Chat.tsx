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
  MoreHorizontal,
  Paperclip,
  Smile,
  Send,
  FileText,
  Image as ImageIcon,
  User,
  X,
  Reply,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import { Message } from '@/types/chat';
import { useClickOutside } from '@/lib/useClickOutside';
import { useAuth } from '@/contexts/AuthContext';
import { chatService, Chat as ChatType, ChatFilters } from '@/lib/chatService';
import { ConversationFilters } from '@/components/chat/ConversationFilters';
import { ConversationListItem } from '@/components/chat/ConversationListItem';
import { FileUploadModal } from '@/components/chat/FileUploadModal';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { MessageSearch } from '@/components/chat/MessageSearch';
import { SearchResults } from '@/components/chat/SearchResults';
import { ConversationListSkeleton } from '@/components/PageSkeletons';
import { CollapsibleClientProfile } from '@/components/admin/CollapsibleClientProfile';

const getDateLabel = (date: Date): string => {
  const today = new Date();
  const messageDate = new Date(date);

  today.setHours(0, 0, 0, 0);
  messageDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - messageDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return messageDate.toLocaleDateString('en-US', { weekday: 'long' });

  return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
};

const shouldShowDateLabel = (currentMessage: Message, previousMessage: Message | undefined): boolean => {
  if (!previousMessage) return true;

  const currentDate = new Date(currentMessage.timestamp);
  const previousDate = new Date(previousMessage.timestamp);

  currentDate.setHours(0, 0, 0, 0);
  previousDate.setHours(0, 0, 0, 0);

  return currentDate.getTime() !== previousDate.getTime();
};

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [messageActionsOpen, setMessageActionsOpen] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [conversationFilters, setConversationFilters] = useState<ChatFilters>({
    status: 'all',
    userType: 'all',
    sortBy: 'recent',
  });
  const [conversationSearch, setConversationSearch] = useState('');
  const [showUserProfile, setShowUserProfile] = useState(false); // Controlled by Info button

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageActionsRef = useRef<HTMLDivElement>(null);

  useClickOutside(moreMenuRef, () => setShowMoreMenu(false));
  useClickOutside(messageActionsRef, () => setMessageActionsOpen(null));

  useEffect(() => {
    if (!user) return;

    const loadChats = async () => {
      setIsLoading(true);
      const filterParams: ChatFilters = {
        ...conversationFilters,
        search: conversationSearch,
      };
      const adminChats = await chatService.getAdminChats(user.id, filterParams);
      setChats(adminChats);
      if (adminChats.length > 0 && !selectedChat) {
        setSelectedChat(adminChats[0]);
      }
      setIsLoading(false);
    };

    loadChats();
  }, [user, conversationFilters, conversationSearch]);

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

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    const success = await chatService.deleteMessage(messageToDelete);
    if (success) {
      setMessages(prev => prev.filter(msg => msg.id !== messageToDelete));
      toast.success('Message deleted');
    } else {
      toast.error('Failed to delete message');
    }

    setDeleteModalOpen(false);
    setMessageToDelete(null);
  };

  const openDeleteModal = (messageId: string) => {
    setMessageToDelete(messageId);
    setDeleteModalOpen(true);
  };

  const handleFileUpload = async (file: File, messageText?: string) => {
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
        user.id,
        messageText
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
  const totalTransactions = selectedChat?.user_assignment?.total_transactions || 0;
  const totalInvoices = selectedChat?.user_assignment?.total_invoices || 0;
  const userCreatedAt = selectedChat?.user_profile?.created_at;
  const lastInteraction = selectedChat?.user_assignment?.last_interaction_at;

  return (
    <div className="p-8">
      <div className="max-w-[1050px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
            Conversations
          </h1>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{chats.length} active chats</p>
          </div>
        </div>

        <div className="flex h-[calc(100vh-14rem)] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Conversations List */}
          <div className={`border-r border-gray-200 dark:border-gray-700 flex flex-col rounded-l-xl overflow-hidden transition-all duration-300 ${
            showUserProfile ? 'w-20' : 'w-80'
          }`}>
            {!showUserProfile && (
              <ConversationFilters
                filters={conversationFilters}
                onFiltersChange={setConversationFilters}
                searchTerm={conversationSearch}
                onSearchChange={setConversationSearch}
              />
            )}

            {/* Collapsed view - Just avatars when profile is open */}
            {showUserProfile && (
              <div className="flex flex-col py-4 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                {chats.map((chat) => {
                  const profile = chat.user_profiles;
                  const initials = profile?.first_name && profile?.last_name
                    ? `${profile.first_name[0]}${profile.last_name[0]}`
                    : profile?.email?.[0]?.toUpperCase() || 'U';

                  const displayName = profile?.first_name && profile?.last_name
                    ? `${profile.first_name} ${profile.last_name[0]}.`
                    : profile?.email?.split('@')[0] || 'User';

                  return (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className="flex flex-col items-center py-3 px-2 group transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      title={profile?.first_name && profile?.last_name
                        ? `${profile.first_name} ${profile.last_name}`
                        : profile?.email || 'User'}
                    >
                      <div className="relative mb-2">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center transition-all ${
                          selectedChat?.id === chat.id
                            ? 'ring-2 ring-blue-500 dark:ring-blue-400'
                            : 'group-hover:ring-2 group-hover:ring-gray-400 dark:group-hover:ring-gray-500'
                        }`}>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {initials}
                          </span>
                        </div>
                        {/* Unread indicator */}
                        {chat.unread_count_admin > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              {chat.unread_count_admin > 9 ? '9+' : chat.unread_count_admin}
                            </span>
                          </div>
                        )}
                        {/* Online indicator */}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 text-center leading-tight">
                        {displayName}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Full conversation list */}
            {!showUserProfile && (
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <ConversationListSkeleton />
                ) : chats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                    <MessageSquare className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No conversations yet</p>
                  </div>
                ) : (
                  chats.map((chat) => (
                    <ConversationListItem
                      key={chat.id}
                      chat={chat}
                      isSelected={selectedChat?.id === chat.id}
                      onClick={() => setSelectedChat(chat)}
                    />
                  ))
                )}
              </div>
            )}
          </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                  {userName !== 'User' ? (
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </span>
                  ) : (
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">{userName}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{userEmail}</p>
                  <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {totalTransactions > 0 && (
                      <span title="Total transaction volume">
                        ${totalTransactions.toLocaleString()} volume
                      </span>
                    )}
                    {totalInvoices > 0 && (
                      <span>{totalInvoices} invoices</span>
                    )}
                    {userCreatedAt && (
                      <span>Joined {new Date(userCreatedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowUserProfile(!showUserProfile)}
                  className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
                    showUserProfile
                      ? 'text-pink-600 bg-pink-50 dark:bg-pink-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  title="View client profile"
                >
                  <Info className="w-5 h-5" />
                </button>
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
                    <MoreHorizontal className="w-5 h-5" />
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
              {messages.map((message, index) => (
                <React.Fragment key={message.id}>
                  {shouldShowDateLabel(message, messages[index - 1]) && (
                    <div className="flex justify-center my-4">
                      <div className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {getDateLabel(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div
                    ref={el => messageRefs.current[message.id] = el}
                    className={`flex group ${message.sender === 'team' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex ${message.sender === 'team' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                      <div className={`${message.type === 'text' ? 'max-w-max' : 'max-w-md'} ${
                        message.sender === 'team'
                          ? 'message-bubble-user text-white'
                          : 'message-bubble-team text-gray-900 dark:text-white'
                      } rounded-lg overflow-hidden`}>
                      {message.type === 'image' && message.fileUrl ? (
                        <div className="flex flex-col">
                          <div className="p-3">
                            <div className="bg-black/10 dark:bg-white/10 rounded-lg overflow-hidden">
                              <img
                                src={message.fileUrl}
                                alt={message.fileName || 'Uploaded image'}
                                className="w-full max-h-96 object-cover"
                              />
                            </div>
                          </div>
                          {message.content && message.content !== message.fileName && (
                            <div className="px-3 pb-2">
                              <p className="text-sm">{message.content}</p>
                            </div>
                          )}
                          <div className={`px-2 py-1.5 -mx-px -mb-px flex items-center ${
                            message.sender === 'team'
                              ? 'bg-[#e83653] justify-end'
                              : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600'
                          }`}>
                            <span className={`text-[8px] leading-none ${
                              message.sender === 'team' ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ) : message.type === 'file' && message.fileUrl ? (
                        <div className="flex flex-col">
                          <div className="px-4 pt-3 pb-2">
                            <div className="flex items-center space-x-2 bg-white/20 dark:bg-gray-800/20 rounded-lg p-2">
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
                                className="p-1 hover:bg-white/20 dark:hover:bg-gray-800/30 rounded transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                          <div className={`px-2 py-1.5 -mx-px -mb-px flex items-center ${
                            message.sender === 'team'
                              ? 'bg-[#e83653] justify-end'
                              : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600'
                          }`}>
                            <span className={`text-[8px] leading-none ${
                              message.sender === 'team' ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <div className="px-3 pt-2 pb-1.5">
                            <p className="text-sm whitespace-nowrap">{message.content}</p>
                          </div>
                          <div className={`px-2 py-1.5 -mx-px -mb-px flex items-center ${
                            message.sender === 'team'
                              ? 'bg-[#e83653] justify-end'
                              : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600'
                          }`}>
                            <span className={`text-[8px] leading-none ${
                              message.sender === 'team' ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      )}
                      </div>
                      <div className="relative mt-1 self-start">
                        <button
                          onClick={() => setMessageActionsOpen(messageActionsOpen === message.id ? null : message.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex-shrink-0"
                          title="Message actions"
                        >
                          <MoreHorizontal className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        </button>
                        {messageActionsOpen === message.id && (
                          <div
                            ref={messageActionsRef}
                            className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[140px]"
                          >
                            <button
                              onClick={() => {
                                setReplyToMessage(message);
                                setMessageActionsOpen(null);
                                textareaRef.current?.focus();
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                            >
                              <Reply className="w-4 h-4" />
                              Reply
                            </button>
                            {message.sender === 'team' && (
                              <button
                                onClick={() => {
                                  openDeleteModal(message.id);
                                  setMessageActionsOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
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
                  {replyToMessage && (
                    <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-400 dark:border-gray-500 rounded flex items-start gap-2">
                      <Reply className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Replying to {replyToMessage.sender === 'user' ? 'user' : 'your'} message</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {replyToMessage.type === 'text' ? replyToMessage.content : `${replyToMessage.type} message`}
                        </p>
                      </div>
                      <button
                        onClick={() => setReplyToMessage(null)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  )}
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

      {/* Collapsible Client Profile */}
      {selectedChat && (
        <CollapsibleClientProfile
          userId={selectedChat.user_id}
          isExpanded={showUserProfile}
        />
      )}
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

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <Modal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setMessageToDelete(null);
            }}
            title="Delete Message"
          >
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Are you sure you want to delete this message? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setMessageToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteMessage}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default AdminChat;
