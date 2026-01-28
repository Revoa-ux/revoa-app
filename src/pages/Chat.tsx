import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
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
  X,
  Reply,
  Hash,
  MoveRight,
  Info,
  PanelLeft,
  Plus,
  User,
  List,
  ChevronDown,
  CheckCircle,
  Package
} from 'lucide-react';
import { toast } from '../lib/toast';
import Modal from '@/components/Modal';
import { Message } from '@/types/chat';
import { useClickOutside } from '@/lib/useClickOutside';
import { useAuth } from '@/contexts/AuthContext';
import { chatService, Chat as ChatType } from '@/lib/chatService';
import { supabase } from '@/lib/supabase';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { MessageSearch } from '@/components/chat/MessageSearch';
import { SearchResults } from '@/components/chat/SearchResults';
import { LoadingSpinner } from '@/components/PageSkeletons';
import { SubscriptionPageWrapper } from '@/components/subscription/SubscriptionPageWrapper';
import { useIsBlocked } from '@/components/subscription/SubscriptionGate';
import { ChannelTabs, ChannelThread } from '@/components/chat/ChannelTabs';
import { ChannelDropdown } from '@/components/chat/ChannelDropdown';
import { ChannelSidebar } from '@/components/chat/ChannelSidebar';
import { AssignToOrderModal } from '@/components/chat/AssignToOrderModal';
import { MoveToThreadModal } from '@/components/chat/MoveToThreadModal';
import { CustomerSidebar } from '@/components/chat/CustomerSidebar';
import { ScenarioTemplateModal } from '@/components/chat/ScenarioTemplateModal';
import { CreateThreadModal } from '@/components/chat/CreateThreadModal';
import { DeleteThreadModal } from '@/components/chat/DeleteThreadModal';
import { ConversationalFlowContainer } from '@/components/chat/ConversationalFlowContainer';
import { formatMessageContent, shouldFormatAsMarkdown } from '@/lib/messageFormatter';

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

const Chat = () => {
  const { user } = useAuth();
  const isBlocked = useIsBlocked();
  const [chat, setChat] = useState<ChatType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminName, setAdminName] = useState('Resolution Team');
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

  // Load mute status from chat metadata
  useEffect(() => {
    if (chat?.metadata?.muted) {
      setIsMuted(chat.metadata.muted);
    }
  }, [chat]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [messageActionsOpen, setMessageActionsOpen] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showCreateThreadModal, setShowCreateThreadModal] = useState(false);
  const [showAssignToOrderModal, setShowAssignToOrderModal] = useState(false);
  const [showBroadTemplateModal, setShowBroadTemplateModal] = useState(false);
  const [selectedTemplateForAssignment, setSelectedTemplateForAssignment] = useState<{id: string; name: string} | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [messageToMove, setMessageToMove] = useState<Message | null>(null);
  const [showMoveToThreadModal, setShowMoveToThreadModal] = useState(false);
  const [showCustomerSidebar, setShowCustomerSidebar] = useState(false);
  const [showThreadSidebar, setShowThreadSidebar] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showThreadDropdown, setShowThreadDropdown] = useState(false);
  const [deleteThreadModalOpen, setDeleteThreadModalOpen] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<ChannelThread | null>(null);
  const [isDeletingThread, setIsDeletingThread] = useState(false);
  const [hasActiveFlow, setHasActiveFlow] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageActionsRef = useRef<HTMLDivElement>(null);
  const threadDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(moreMenuRef, () => setShowMoreMenu(false));
  useClickOutside(threadDropdownRef, () => setShowThreadDropdown(false));
  useClickOutside(messageActionsRef, () => setMessageActionsOpen(null));

  useEffect(() => {
    if (!user) return;

    if (isBlocked) {
      setIsLoading(false);
      return;
    }

    const loadChat = async () => {
      setIsLoading(true);
      try {
        // Initialize chat (assigns admin if needed, creates chat, sends welcome message)
        const initResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initialize-chat`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!initResponse.ok) {
          throw new Error('Failed to initialize chat');
        }

        const { chat: initializedChat } = await initResponse.json();

        if (!initializedChat) {
          throw new Error('No chat returned from initialization');
        }

        setChat(initializedChat);

        // Get admin's profile info
        if (initializedChat.admin_id) {
          const { data: adminProfile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, name, profile_picture_url')
            .eq('id', initializedChat.admin_id)
            .single();

          if (adminProfile) {
            const fullName = [adminProfile.first_name, adminProfile.last_name]
              .filter(Boolean)
              .join(' ') || adminProfile.name;

            if (fullName) {
              setAdminName(fullName);
            }

            if (adminProfile.profile_picture_url) {
              setAdminAvatar(adminProfile.profile_picture_url);
            }
          }
        }

        // Load messages
        const msgs = await chatService.getChatMessages(initializedChat.id);
        setMessages(msgs);
        await chatService.markMessagesAsRead(initializedChat.id, false);

        // Load threads
        setIsLoadingThreads(true);
        const chatThreads = await chatService.getChatThreads(initializedChat.id);
        setThreads(chatThreads);
        setIsLoadingThreads(false);
      } catch (error) {
        console.error('Error loading chat:', error);
        toast.error('Failed to load chat. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadChat();
  }, [user, isBlocked]);

  // Load thread messages when thread is selected
  useEffect(() => {
    // Clear messages immediately when switching threads to prevent flash of old messages
    setMessages([]);
    setHasActiveFlow(false);

    if (!chat || !selectedThreadId) return;

    const loadThreadMessages = async () => {
      const msgs = await chatService.getThreadMessages(selectedThreadId);
      setMessages(msgs);
    };

    loadThreadMessages();
  }, [chat, selectedThreadId]);

  useEffect(() => {
    if (!chat) return;

    let mainChannel;
    let threadChannel;
    let threadsChannel;

    if (selectedThreadId) {
      // Subscribe to thread messages
      threadChannel = chatService.subscribeToThreadMessages(selectedThreadId, (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
        if (newMessage.sender === 'team') {
          setIsTyping(false);
        }
      });
    } else {
      // Subscribe to main chat messages
      mainChannel = chatService.subscribeToMessages(chat.id, (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
        if (newMessage.sender === 'team') {
          setIsTyping(false);
        }
      });
    }

    // Subscribe to thread list changes
    threadsChannel = chatService.subscribeToThreads(chat.id, (updatedThreads) => {
      setThreads(updatedThreads);
    });

    return () => {
      mainChannel?.unsubscribe();
      threadChannel?.unsubscribe();
      threadsChannel?.unsubscribe();
    };
  }, [chat, selectedThreadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleResize = () => {
      if (selectedThreadId && window.innerWidth >= 1024) {
        setShowCustomerSidebar(true);
      } else if (!selectedThreadId) {
        setShowCustomerSidebar(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedThreadId]);

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
    if (!newMessage.trim() && !selectedFile) return;
    if (!chat || !user) {
      toast.error('Chat is loading. Please wait a moment and try again.');
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
    }

    // Handle file upload if present
    if (selectedFile) {
      try {
        toast.info('Uploading file...');
        const savedMessage = await chatService.sendFileMessage(
          chat.id,
          selectedFile,
          'user',
          user.id,
          messageText || undefined
        );

        if (savedMessage) {
          setMessages(prev => [...prev, savedMessage]);
          setSelectedFile(null);
          setFilePreview(null);
          toast.success('File sent successfully');
        } else {
          toast.error('Failed to send file');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error('Failed to send file');
      }
      return;
    }

    // Handle text message
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

    let savedMessage;
    if (selectedThreadId) {
      // Send to thread
      savedMessage = await chatService.sendThreadMessage(
        selectedThreadId,
        chat.id,
        messageText,
        'text',
        'user'
      );
    } else {
      // Send to main chat
      savedMessage = await chatService.sendMessage(
        chat.id,
        messageText,
        'text',
        'user'
      );
    }

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }

    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
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

  const handleThreadSelect = (threadId: string | null) => {
    setSelectedThreadId(threadId);
  };

  const handleThreadCreated = async (threadId: string) => {
    setShowCreateThreadModal(false);
    setShowAssignToOrderModal(false);

    // Reload threads
    if (chat) {
      const updatedThreads = await chatService.getChatThreads(chat.id);
      setThreads(updatedThreads);
      // Switch to the newly created thread
      setSelectedThreadId(threadId);

      if (selectedTemplateForAssignment) {
        setTimeout(() => {
          setShowTemplateModal(true);
          setSelectedTemplateForAssignment(null);
        }, 300);
      }
    }
  };

  const handleCloseThread = async (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;

    // Open the delete modal instead of using browser confirm
    setThreadToDelete(thread);
    setDeleteThreadModalOpen(true);
  };

  const confirmDeleteThread = async () => {
    if (!threadToDelete) return;

    setIsDeletingThread(true);
    const success = await chatService.closeThread(threadToDelete.id);

    if (success) {
      toast.success('Thread deleted');
      // Reload threads
      if (chat) {
        const updatedThreads = await chatService.getChatThreads(chat.id);
        setThreads(updatedThreads);
      }
      // If we were viewing this thread, switch to main chat
      if (selectedThreadId === threadToDelete.id) {
        setSelectedThreadId(null);
      }
    } else {
      toast.error('Failed to delete thread');
    }

    setIsDeletingThread(false);
    setDeleteThreadModalOpen(false);
    setThreadToDelete(null);
  };

  const handleDeleteThread = async (threadId: string) => {
    // Delete uses the same logic as close
    await handleCloseThread(threadId);
  };

  const handleRestartThread = async (threadId: string) => {
    // Removed - restart functionality not needed for now
    toast.info('Feature coming soon');
  };

  const handleMoveToThread = async (threadId: string) => {
    if (!messageToMove || !chat) return;

    try {
      // Move message to the selected thread
      await chatService.moveMessageToThread(messageToMove.id, threadId);

      // Remove message from current view
      setMessages(prev => prev.filter(m => m.id !== messageToMove.id));

      toast.success('Message moved to thread');
      setMessageToMove(null);
      setShowMoveToThreadModal(false);
    } catch (error) {
      console.error('Error moving message:', error);
      toast.error('Failed to move message');
    }
  };

  return (
    <SubscriptionPageWrapper>
      <Helmet>
        <title>Resolution Center | Revoa</title>
      </Helmet>
    <div className="flex flex-col h-full w-full mx-auto overflow-hidden">
      {/* Page Title - Hidden on mobile, visible on desktop */}
      <div className="hidden lg:block mb-6">
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Resolution Center
        </h1>
        <div className="flex items-start sm:items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></span>
          <span>Get help with your orders and issues</span>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] flex overflow-hidden min-h-0 w-full max-w-full relative">
        {/* Thread Sidebar - Full Height */}
        {isBlocked ? (
          <div className="w-64 border-r border-gray-200 dark:border-[#3a3a3a] flex-shrink-0 flex flex-col bg-gray-50 dark:bg-dark/50">
            <div className="p-4 border-b border-gray-200 dark:border-[#3a3a3a]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500">Threads</h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="p-3 rounded-lg bg-white dark:bg-[#3a3a3a]/50">
                  <div className="text-sm font-medium text-gray-400 dark:text-gray-500">...</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">...</div>
                </div>
              ))}
            </div>
          </div>
        ) : chat && (
          <ChannelSidebar
            threads={threads}
            selectedThreadId={selectedThreadId}
            onThreadSelect={handleThreadSelect}
            onCreateThread={() => setShowCreateThreadModal(true)}
            onDeleteThread={handleDeleteThread}
            onRestartThread={handleRestartThread}
            isOpen={showThreadSidebar}
            onClose={() => setShowThreadSidebar(false)}
            isCustomerSidebarOpen={showCustomerSidebar && !!selectedThreadId}
          />
        )}

        {/* Main Chat Content - Middle Section */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header - Only spans middle chat area */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-[#3a3a3a]">
            {/* Left: Agent Profile and Name */}
            <div className="flex items-center space-x-3 min-w-0">
              <img
                src={adminAvatar}
                alt={adminName}
                className="w-8 h-8 rounded-full flex-shrink-0 border border-gray-200 dark:border-[#4a4a4a] bg-white/60 dark:bg-dark/60 backdrop-blur-sm"
              />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {adminName}
                </h3>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Thread Dropdown */}
              <div ref={threadDropdownRef} className="relative flex-shrink-0">
                <button
                  onClick={() => setShowThreadDropdown(!showThreadDropdown)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-[#3a3a3a]/50 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors focus:outline-none focus:ring-0"
                  title="Select Thread"
                >
                  {selectedThreadId ? (
                    <span className="text-sm font-medium">
                      {threads.find(t => t.id === selectedThreadId)?.order_number || threads.find(t => t.id === selectedThreadId)?.title}
                    </span>
                  ) : (
                    <>
                      <Hash className="w-5 h-5" />
                      <span className="text-sm font-medium">main-chat</span>
                    </>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showThreadDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Thread Dropdown Menu */}
                {showThreadDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg shadow-lg z-[100] flex flex-col max-h-96">
                    {/* Scrollable thread list */}
                    <div className="flex-1 overflow-y-auto">
                      {/* Main Chat */}
                      <button
                        onClick={() => {
                          setSelectedThreadId(null);
                          setShowThreadDropdown(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                          !selectedThreadId ? 'bg-gray-100 dark:bg-[#3a3a3a]/30' : ''
                        }`}
                      >
                        <Hash className="w-5 h-5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">main-chat</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">General conversation</div>
                        </div>
                      </button>

                      {/* Threads */}
                      {threads.filter(t => t.status === 'open').map((thread) => (
                        <div key={thread.id} className="relative group border-t border-gray-100 dark:border-[#3a3a3a]">
                          <button
                            onClick={() => {
                              setSelectedThreadId(thread.id);
                              setShowThreadDropdown(false);
                            }}
                            className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors ${
                              selectedThreadId === thread.id ? 'bg-gray-100 dark:bg-[#3a3a3a]/30' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {thread.order_number || thread.title}
                                </span>
                                {thread.tag && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium ${
                                    thread.tag === 'return' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                                    thread.tag === 'replacement' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
                                    thread.tag === 'damaged' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                                    thread.tag === 'defective' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                                    thread.tag === 'shipping' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                                    thread.tag === 'refund' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                                    thread.tag === 'missing_items' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                    thread.tag === 'wrong_item' ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400' :
                                    thread.tag === 'cancel_modify' ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400' :
                                    'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                                  }`}>
                                    {thread.tag === 'missing_items' ? 'Missing Items' :
                                     thread.tag === 'wrong_item' ? 'Wrong Item' :
                                     thread.tag === 'cancel_modify' ? 'Cancel/Modify' :
                                     thread.tag.charAt(0).toUpperCase() + thread.tag.slice(1)}
                                  </span>
                                )}
                              </div>
                              {thread.customer_name && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{thread.customer_name}</div>
                              )}
                            </div>
                            {thread.unread_count && thread.unread_count > 0 && (
                              <span className="flex-shrink-0 bg-rose-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                                {thread.unread_count}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setThreadToDelete(thread);
                                setDeleteThreadModalOpen(true);
                                setShowThreadDropdown(false);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded transition-all"
                              title="Close thread"
                            >
                              <X className="w-3.5 h-3.5 text-rose-500" />
                            </button>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Create New Thread - Sticky at bottom */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateThreadModal(true);
                        setShowThreadDropdown(false);
                      }}
                      className="sticky bottom-0 w-full flex items-center space-x-3 px-4 py-3 bg-white dark:bg-dark hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors border-t border-gray-200 dark:border-[#4a4a4a] rounded-b-lg"
                    >
                      <Plus className="w-5 h-5 flex-shrink-0 text-rose-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Create New Thread</span>
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTimeout(() => {
                    if (selectedThreadId) {
                      setShowTemplateModal(true);
                    } else {
                      setShowBroadTemplateModal(true);
                    }
                  }, 0);
                }}
                className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
                title="Quick Email Templates"
              >
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setShowSearchModal(true)}
                className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
                title="Search Messages"
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.5} />
              </button>
              {/* Customer Sidebar Toggle */}
              {selectedThreadId && (
                <button
                  onClick={() => setShowCustomerSidebar(!showCustomerSidebar)}
                  className={`p-2 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors ${
                    showCustomerSidebar
                      ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                  title="Customer Info"
                >
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            {/* Channel Tabs - Hidden */}
            {/* {chat && threads.length > 0 && (
              <ChannelTabs
                threads={threads}
                selectedThreadId={selectedThreadId}
                onThreadSelect={handleThreadSelect}
                onCloseThread={handleCloseThread}
              />
            )} */}

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isBlocked ? (
            <div className="space-y-4">
              {/* Placeholder team message */}
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3a3a3a] flex-shrink-0" />
                  <div className="bg-gray-100 dark:bg-[#3a3a3a] rounded-lg px-3 pt-2 pb-1.5">
                    <p className="text-sm text-gray-400 dark:text-gray-500">...</p>
                  </div>
                </div>
              </div>

              {/* Placeholder user message */}
              <div className="flex justify-end">
                <div className="bg-gray-200 dark:bg-[#4a4a4a] rounded-lg px-3 pt-2 pb-1.5">
                  <p className="text-sm text-gray-400 dark:text-gray-500">...</p>
                </div>
              </div>

              {/* Placeholder team message */}
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3a3a3a] flex-shrink-0" />
                  <div className="bg-gray-100 dark:bg-[#3a3a3a] rounded-lg px-3 pt-2 pb-1.5">
                    <p className="text-sm text-gray-400 dark:text-gray-500">...</p>
                  </div>
                </div>
              </div>

              {/* Placeholder user message */}
              <div className="flex justify-end">
                <div className="bg-gray-200 dark:bg-[#4a4a4a] rounded-lg px-3 pt-2 pb-1.5">
                  <p className="text-sm text-gray-400 dark:text-gray-500">...</p>
                </div>
              </div>

              {/* Placeholder team message */}
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3a3a3a] flex-shrink-0" />
                  <div className="bg-gray-100 dark:bg-[#3a3a3a] rounded-lg px-3 pt-2 pb-1.5">
                    <p className="text-sm text-gray-400 dark:text-gray-500">...</p>
                  </div>
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="space-y-4 animate-pulse">
              {/* Team message skeleton */}
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3a3a3a] flex-shrink-0" />
                  <div className="bg-gray-200 dark:bg-[#3a3a3a] rounded-lg p-3">
                    <div className="h-4 w-48 bg-gray-300 dark:bg-[#4a4a4a] rounded" />
                  </div>
                </div>
              </div>

              {/* User message skeleton */}
              <div className="flex justify-end">
                <div className="bg-gray-200 dark:bg-[#3a3a3a] rounded-lg p-3">
                  <div className="h-4 w-32 bg-gray-300 dark:bg-[#4a4a4a] rounded" />
                </div>
              </div>

              {/* Team message skeleton */}
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3a3a3a] flex-shrink-0" />
                  <div className="bg-gray-200 dark:bg-[#3a3a3a] rounded-lg p-3">
                    <div className="h-4 w-64 bg-gray-300 dark:bg-[#4a4a4a] rounded mb-2" />
                    <div className="h-4 w-40 bg-gray-300 dark:bg-[#4a4a4a] rounded" />
                  </div>
                </div>
              </div>

              {/* User message skeleton */}
              <div className="flex justify-end">
                <div className="bg-gray-200 dark:bg-[#3a3a3a] rounded-lg p-3">
                  <div className="h-4 w-56 bg-gray-300 dark:bg-[#4a4a4a] rounded" />
                </div>
              </div>

              {/* Team message skeleton */}
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3a3a3a] flex-shrink-0" />
                  <div className="bg-gray-200 dark:bg-[#3a3a3a] rounded-lg p-3">
                    <div className="h-4 w-44 bg-gray-300 dark:bg-[#4a4a4a] rounded" />
                  </div>
                </div>
              </div>
            </div>
          ) : (messages.length === 0 && !hasActiveFlow && !selectedThreadId) ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No messages yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Start a conversation with your assigned admin</p>
              </div>
            </div>
          ) : null}

          {/* Conversational Flow - Show if a thread is selected and has an active flow */}
          {!isLoading && selectedThreadId && (
            <ConversationalFlowContainer
              threadId={selectedThreadId}
              onFlowActive={setHasActiveFlow}
            />
          )}

          {!isLoading && messages
            // Filter out auto-generated messages when a flow is active
            .filter(message => {
              // If no active flow, show all messages
              if (!hasActiveFlow) return true;

              // When flow is active, hide auto-generated welcome/intro messages
              // These are typically the first messages from 'team' sender
              const isAutoGeneratedMessage =
                message.sender === 'team' &&
                message.content?.includes('nice to meet you') ||
                message.content?.includes('Welcome to') ||
                message.content?.includes('Resolution Center');

              return !isAutoGeneratedMessage;
            })
            .map((message, index) => (
            <React.Fragment key={message.id}>
              {shouldShowDateLabel(message, messages[index - 1]) && (
                <div className="flex justify-center my-4">
                  <div className="px-4 py-1.5 bg-gradient-to-b from-gray-100 via-gray-50 to-gray-100 dark:from-[#3a3a3a] dark:via-[#2a2a2a] dark:to-[#3a3a3a] border border-gray-200/50 dark:border-[#4a4a4a]/50 rounded-full shadow-sm backdrop-blur-sm flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      {getDateLabel(message.timestamp)}
                    </span>
                  </div>
                </div>
              )}
              <div
                ref={el => messageRefs.current[message.id] = el}
                className={`flex group ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[85%] lg:max-w-[75%] xl:max-w-[65%]`}>
                  <div className={`${message.type === 'text' ? 'max-w-full' : 'max-w-md'} ${
                    message.sender === 'user'
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
                        message.sender === 'user'
                          ? 'bg-[#e83653] justify-end'
                          : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#3a3a3a] dark:to-[#4a4a4a]'
                      }`}>
                        <span className={`text-[8px] leading-none ${
                          message.sender === 'user' ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ) : message.type === 'file' && message.fileUrl ? (
                    <div className="flex flex-col">
                      <div className="px-4 pt-3 pb-2">
                        <a
                          href={message.fileUrl}
                          download={message.fileName}
                          className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                        >
                          <div className={`p-2 rounded-lg ${
                            message.sender === 'user'
                              ? 'bg-white/20'
                              : 'bg-gray-100 dark:bg-[#3a3a3a]'
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
                      </div>
                      <div className={`px-2 py-1.5 -mx-px -mb-px flex items-center ${
                        message.sender === 'user'
                          ? 'bg-[#e83653] justify-end'
                          : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#3a3a3a] dark:to-[#4a4a4a]'
                      }`}>
                        <span className={`text-[8px] leading-none ${
                          message.sender === 'user' ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <div className="px-3 pt-2 pb-1.5">
                        {shouldFormatAsMarkdown(message.content) ? (
                          <div
                            className="text-sm break-words formatted-message"
                            dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                          />
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        )}
                      </div>
                      <div className={`px-2 py-1.5 -mx-px -mb-px flex items-center ${
                        message.sender === 'user'
                          ? 'bg-[#e83653] justify-end'
                          : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#3a3a3a] dark:to-[#4a4a4a]'
                      }`}>
                        <span className={`text-[8px] leading-none ${
                          message.sender === 'user' ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )}
                  </div>
                  <div className="relative mt-2 self-start">
                    <button
                      onClick={() => setMessageActionsOpen(messageActionsOpen === message.id ? null : message.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-200 dark:hover:bg-[#3a3a3a] rounded flex-shrink-0"
                      title="Message actions"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </button>
                    {messageActionsOpen === message.id && (
                      <div
                        ref={messageActionsRef}
                        className="fixed bg-white dark:bg-dark rounded-lg shadow-2xl border border-gray-200 dark:border-[#3a3a3a] p-1 z-[9999] min-w-[140px]"
                        style={{
                          top: (messageRefs.current[message.id]?.getBoundingClientRect().bottom || 0) + 4,
                          ...(message.sender === 'user'
                            ? { right: window.innerWidth - (messageRefs.current[message.id]?.getBoundingClientRect().right || 0) }
                            : { left: messageRefs.current[message.id]?.getBoundingClientRect().left || 0 }
                          )
                        }}
                      >
                        <button
                          onClick={() => {
                            setReplyToMessage(message);
                            setMessageActionsOpen(null);
                            textareaRef.current?.focus();
                          }}
                          className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-gray-100 dark:hover:bg-[#3a3a3a] flex items-center gap-2 text-gray-700 dark:text-gray-300"
                        >
                          <Reply className="w-4 h-4" />
                          Reply
                        </button>
                        {message.sender === 'user' && (
                          <>
                            <button
                              onClick={() => {
                                setMessageToMove(message);
                                setShowMoveToThreadModal(true);
                                setMessageActionsOpen(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-gray-100 dark:hover:bg-[#3a3a3a] flex items-center gap-2 text-gray-700 dark:text-gray-300"
                            >
                              <MoveRight className="w-4 h-4" />
                              Move to Thread
                            </button>
                            <button
                              onClick={() => {
                                openDeleteModal(message.id);
                                setMessageActionsOpen(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
          {isTyping && (
            <div className="flex items-end space-x-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white dark:bg-[#3a3a3a] border border-gray-100 dark:border-[#4a4a4a]">
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
          </div>

          <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-[#3a3a3a]">
          <div className="relative bg-gray-50 dark:bg-[#3a3a3a] rounded-xl !border-0 !outline-none !ring-0 focus-within:!border-0 focus-within:!outline-none focus-within:!ring-0" style={{ border: 'none', outline: 'none', boxShadow: 'none' }}>
            <div className="min-h-[44px] p-3">
              {replyToMessage && (
                <div className="mb-2 p-2 bg-gray-50 dark:bg-dark border-l-4 border-gray-400 dark:border-gray-500 rounded flex items-start gap-2">
                  <Reply className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Replying to {replyToMessage.sender === 'user' ? 'your' : 'admin'} message</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {replyToMessage.type === 'text' ? replyToMessage.content : `${replyToMessage.type} message`}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyToMessage(null)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-[#3a3a3a] rounded transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              )}
              {selectedFile && (
                <div className="mb-2 p-2 bg-white dark:bg-[#4a4a4a] rounded-lg flex items-center gap-2">
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="w-12 h-12 rounded object-cover" />
                  ) : (
                    <FileText className="w-12 h-12 text-gray-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
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
                placeholder={selectedFile ? "Add a caption (optional)..." : "Type a message..."}
                className="w-full min-h-[24px] max-h-[120px] text-sm bg-transparent dark:text-white focus:outline-none focus:ring-0 focus:border-0 resize-none placeholder-gray-400 dark:placeholder-gray-500"
                style={{
                  height: '24px',
                  overflowY: 'hidden',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none'
                }}
              />

              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center space-x-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors"
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
                  <button
                    onClick={() => setShowCreateThreadModal(true)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors"
                    title="Create New Thread"
                  >
                    <Hash className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() && !selectedFile}
                  className="p-2 rounded-lg transition-all disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-[#4a4a4a] flex items-center justify-center"
                >
                  {(newMessage.trim() || selectedFile) ? (
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

        {/* Customer Sidebar - Full Height - Only shows when viewing a thread */}
        {selectedThreadId && chat && user && (
          <CustomerSidebar
            threadId={selectedThreadId}
            userId={user.id}
            isExpanded={showCustomerSidebar}
            externalTemplateOpen={showTemplateModal}
            onExternalTemplateClose={() => setShowTemplateModal(false)}
            onClose={() => setShowCustomerSidebar(false)}
          />
        )}
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
                className="btn btn-secondary px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMessage}
                className="btn btn-danger px-4 py-2 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Thread Modal (from header) */}
      <CreateThreadModal
        isOpen={showCreateThreadModal}
        onClose={() => setShowCreateThreadModal(false)}
        chatId={chat?.id || ''}
        userId={user?.id || ''}
        onThreadCreated={handleThreadCreated}
      />

      {/* Assign to Order Modal (from message input) */}
      <AssignToOrderModal
        isOpen={showAssignToOrderModal}
        onClose={() => {
          setShowAssignToOrderModal(false);
          setSelectedTemplateForAssignment(null);
        }}
        chatId={chat?.id || ''}
        userId={user?.id || ''}
        onThreadCreated={handleThreadCreated}
        mode="assign"
        preSelectedTemplate={selectedTemplateForAssignment}
      />

      {/* Broad Template Modal (from header when no thread selected) */}
      <ScenarioTemplateModal
        isOpen={showBroadTemplateModal}
        onClose={() => setShowBroadTemplateModal(false)}
        userId={user?.id}
        onSelectTemplate={(template) => {
          setSelectedTemplateForAssignment({ id: template.id, name: template.name });
          setShowAssignToOrderModal(true);
        }}
      />

      {/* Thread Template Modal (from header when thread is selected) */}
      <ScenarioTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        userId={user?.id}
        threadTag={threads.find(t => t.id === selectedThreadId)?.tag || undefined}
        onSelectTemplate={async (template) => {
          if (!chat || !selectedThreadId) return;

          try {
            await supabase.from('messages').insert({
              chat_id: chat.id,
              thread_id: selectedThreadId,
              content: template.body,
              type: 'text',
              sender: 'user',
              timestamp: new Date().toISOString(),
            });

            setShowTemplateModal(false);
            toast.success('Template sent');
          } catch (error) {
            console.error('Error sending template:', error);
            toast.error('Failed to send template');
          }
        }}
      />

      {/* Move to Thread Modal */}
      <MoveToThreadModal
        isOpen={showMoveToThreadModal}
        onClose={() => {
          setShowMoveToThreadModal(false);
          setMessageToMove(null);
        }}
        threads={threads}
        onMoveToThread={handleMoveToThread}
        currentThreadId={selectedThreadId}
      />

      {/* Delete Thread Modal */}
      {deleteThreadModalOpen && threadToDelete && (
        <DeleteThreadModal
          isOpen={deleteThreadModalOpen}
          onClose={() => {
            setDeleteThreadModalOpen(false);
            setThreadToDelete(null);
            setIsDeletingThread(false);
          }}
          onConfirm={confirmDeleteThread}
          threadTitle={threadToDelete.order_number || threadToDelete.title}
          isDeleting={isDeletingThread}
        />
      )}

    </div>
    </SubscriptionPageWrapper>
  );
};

export default Chat;
