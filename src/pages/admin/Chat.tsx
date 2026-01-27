import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Download,
  MessageSquare,
  Search,
  Paperclip,
  Smile,
  Send,
  FileText,
  User,
  X,
  Reply,
  Info,
  MoreHorizontal,
  Trash2,
  Tag,
  Package,
  Hash,
  Sparkles,
  Play,
  AlertCircle,
  List,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from '../../lib/toast';
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
import { ConversationTagModal } from '@/components/chat/ConversationTagModal';
import { ThreadSelector, ChatThread } from '@/components/chat/ThreadSelector';
import { CreateThreadModal } from '@/components/chat/CreateThreadModal';
import { EmailComposerModal } from '@/components/chat/EmailComposerModal';
import { ScenarioTemplateModal } from '@/components/chat/ScenarioTemplateModal';
import { ChannelDropdown } from '@/components/chat/ChannelDropdown';
import { ChannelThread } from '@/components/chat/ChannelTabs';
import { CustomerProfileSidebar } from '@/components/admin/CustomerProfileSidebar';
import { formatMessageContent, shouldFormatAsMarkdown } from '@/lib/messageFormatter';
import { ConversationalFlowContainer } from '@/components/chat/ConversationalFlowContainer';
import { ThreadEscalationBanner } from '@/components/chat/ThreadEscalationBanner';
import { flowTriggerService } from '@/lib/flowTriggerService';
import { useConversationalFlow } from '@/hooks/useConversationalFlow';
import { HorizontalConversationList } from '@/components/chat/HorizontalConversationList';

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

const getThreadBubbleColor = (tag?: string) => {
  if (!tag) return '';

  const colorMap: Record<string, string> = {
    return: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800',
    replacement: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800',
    damaged: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800',
    defective: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800',
  };

  return colorMap[tag] || '';
};

const AdminChat = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [chats, setChats] = useState<ChatType[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [pendingOrderThreadId, setPendingOrderThreadId] = useState<string | null>(null);
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
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [showTagModal, setShowTagModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showCreateThreadModal, setShowCreateThreadModal] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showScenarioTemplate, setShowScenarioTemplate] = useState(false);
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);
  const [threadTags, setThreadTags] = useState<string[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [suggestedFlowId, setSuggestedFlowId] = useState<string | null>(null);
  const [showFlowSuggestion, setShowFlowSuggestion] = useState(false);
  const { session: activeFlowSession, startFlow, flow: activeFlow } = useConversationalFlow(selectedThreadId || '__no_thread__');

  // Handle responsive behavior - keep conversation list closed by default on all screen sizes
  useEffect(() => {
    const handleResize = () => {
      // On all screen sizes, hide sidebars by default to show chat area
      setShowConversationList(false);
      setShowUserProfile(false);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-close sidebars on mobile when a chat is selected
  useEffect(() => {
    if (selectedChat && window.innerWidth < 1024) {
      setShowConversationList(false);
      setShowUserProfile(false);
    }
  }, [selectedChat]);

  // Smart sidebar management: on mobile, opening one closes the other
  const handleToggleConversationList = () => {
    if (!showConversationList && showUserProfile) {
      setShowUserProfile(false);
    }
    setShowConversationList(!showConversationList);
  };

  const handleToggleUserProfile = () => {
    if (!showUserProfile && showConversationList) {
      setShowConversationList(false);
    }
    setShowUserProfile(!showUserProfile);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageActionsRef = useRef<HTMLDivElement>(null);

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
  }, [user, conversationFilters, conversationSearch, refreshTrigger]);

  useEffect(() => {
    if (!chats.length || isLoading) return;

    const chatId = searchParams.get('chatId');
    const threadId = searchParams.get('threadId');
    const createThread = searchParams.get('createThread');
    const orderId = searchParams.get('orderId');

    if (chatId) {
      const targetChat = chats.find(c => c.id === chatId);
      if (targetChat && targetChat.id !== selectedChat?.id) {
        setSelectedChat(targetChat);
      }
    }

    if (threadId && selectedChat) {
      setSelectedThreadId(threadId);
    }

    if (createThread === 'order' && orderId && selectedChat) {
      setPendingOrderThreadId(orderId);
      setShowCreateThreadModal(true);
      setSearchParams({});
    }
  }, [chats, isLoading, searchParams, selectedChat?.id]);

  useEffect(() => {
    if (!selectedChat) return;

    // Reset thread selection when chat changes
    setSelectedThreadId(null);

    const loadMessages = async () => {
      const msgs = await chatService.getChatMessages(selectedChat.id);
      setMessages(msgs);
      await chatService.markMessagesAsRead(selectedChat.id, true);
    };

    const loadThreads = async () => {
      setIsLoadingThreads(true);
      const chatThreads = await chatService.getChatThreads(selectedChat.id);
      setThreads(chatThreads);
      setIsLoadingThreads(false);
    };

    loadMessages();
    loadThreads();
  }, [selectedChat?.id]);

  // Load messages when thread is selected
  useEffect(() => {
    if (!selectedChat || !selectedThreadId) return;

    const loadThreadMessages = async () => {
      console.log('[Chat] Loading messages for thread:', selectedThreadId);

      try {
        const regularMessages = await chatService.getThreadMessages(selectedThreadId);
        console.log('[Chat] Regular messages loaded:', regularMessages.length);

        // Load flow messages from all sessions (including completed ones)
        console.log('[Chat] Fetching flow sessions...');
        const { data: sessions, error: sessionsError } = await chatService.supabase
          .from('thread_flow_sessions')
          .select(`
            *,
            bot_flows (
              name,
              flow_definition
            )
          `)
          .eq('thread_id', selectedThreadId)
          .order('started_at', { ascending: true });

        if (sessionsError) {
          console.error('[Chat] Flow sessions query error:', sessionsError);
          toast.error(`Failed to load flow sessions: ${sessionsError.message}`);
        }

        console.log('[Chat] Flow sessions loaded:', sessions?.length || 0, 'sessions');

        const flowMessages: Message[] = [];

        if (sessions) {
          for (const session of sessions) {
            console.log('[Chat] Processing flow session:', session.id, {
              flow_name: session.bot_flows?.name,
              is_active: session.is_active,
              completed_at: session.completed_at,
              flow_state: session.flow_state
            });

            const flowState = session.flow_state || {};
            const flowDefinition = session.bot_flows?.flow_definition;

            console.log('[Chat] Flow definition nodes:', flowDefinition?.nodes?.length || 0);
            console.log('[Chat] Flow state entries:', Object.keys(flowState).length);

            // Convert each flow response to a message
            for (const [nodeId, nodeData] of Object.entries(flowState)) {
              if (nodeData && typeof nodeData === 'object' && 'response' in nodeData && 'timestamp' in nodeData) {
                const node = flowDefinition?.nodes?.find((n: any) => n.id === nodeId);

                console.log('[Chat] Creating flow message for node:', nodeId, {
                  has_node: !!node,
                  message: node?.message,
                  timestamp: nodeData.timestamp
                });

                flowMessages.push({
                  id: `flow-${session.id}-${nodeId}`,
                  content: node?.message || '',
                  type: 'text',
                  sender: 'team',
                  timestamp: new Date(nodeData.timestamp),
                  metadata: {
                    isFlowMessage: true,
                    flowSessionId: session.id,
                    flowName: session.bot_flows?.name,
                    flowCompleted: !!session.completed_at,
                    flowActive: session.is_active
                  }
                });
              }
            }
          }
        }

        console.log('[Chat] Flow messages created:', flowMessages.length);

        // Combine and sort by timestamp
        const allMessages = [...regularMessages, ...flowMessages].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        console.log('[Chat] Total messages (regular + flow):', allMessages.length);
        setMessages(allMessages);
      } catch (error) {
        console.error('[Chat] Error loading thread messages:', error);
        toast.error('Failed to load thread messages');
      }
    };

    loadThreadMessages();
  }, [selectedChat, selectedThreadId]);

  // Auto-suggest and auto-trigger flows based on thread tags
  useEffect(() => {
    if (!selectedThreadId) {
      setSuggestedFlowId(null);
      setShowFlowSuggestion(false);
      return;
    }

    const checkAndSuggestFlow = async () => {
      const currentThread = threads.find(t => t.id === selectedThreadId);
      if (!currentThread) return;

      // Don't suggest if there's already an active flow
      if (activeFlowSession?.is_active) {
        setShowFlowSuggestion(false);
        return;
      }

      const flowId = await flowTriggerService.suggestFlowForThread(
        selectedThreadId,
        currentThread.title,
        currentThread.tag || undefined
      );

      if (flowId) {
        setSuggestedFlowId(flowId);
        setShowFlowSuggestion(true);

        // Auto-start flows for specific tags
        const shouldAutoStart = currentThread.tag && ['return', 'damage', 'defective'].includes(currentThread.tag.toLowerCase());
        if (shouldAutoStart) {
          const autoStarted = await flowTriggerService.autoStartFlowIfNeeded(
            selectedThreadId,
            currentThread.title,
            currentThread.tag || undefined
          );

          if (autoStarted) {
            toast.success(`Started ${currentThread.tag} resolution flow`);
            setShowFlowSuggestion(false);
          }
        }
      }
    };

    checkAndSuggestFlow();
  }, [selectedThreadId, threads, activeFlowSession]);

  useEffect(() => {
    if (!selectedChat) return;

    let mainChannel;
    let threadChannel;
    let threadsChannel;

    if (selectedThreadId) {
      // Subscribe to thread messages
      threadChannel = chatService.subscribeToThreadMessages(selectedThreadId, (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
        if (newMessage.sender === 'user') {
          setIsTyping(false);
        }
      });
    } else {
      // Subscribe to main chat messages
      mainChannel = chatService.subscribeToMessages(selectedChat.id, (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
        if (newMessage.sender === 'user') {
          setIsTyping(false);
        }
      });
    }

    // Subscribe to thread list changes
    threadsChannel = chatService.subscribeToThreads(selectedChat.id, (updatedThreads) => {
      setThreads(updatedThreads);
    });

    return () => {
      mainChannel?.unsubscribe();
      threadChannel?.unsubscribe();
      threadsChannel?.unsubscribe();
    };
  }, [selectedChat, selectedThreadId]);

  // Don't auto-open sidebar on mobile to avoid blocking chat
  useEffect(() => {
    if (!selectedThreadId) return;

    const isLargeScreen = window.innerWidth >= 1024;
    if (!isLargeScreen) return; // Skip auto-open on mobile

    const currentThread = threads.find(t => t.id === selectedThreadId);
    if (currentThread?.order_id) {
      setShowUserProfile(true);
    }
  }, [selectedThreadId, threads]);

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

    let savedMessage;
    if (selectedThreadId) {
      // Send to thread
      savedMessage = await chatService.sendThreadMessage(
        selectedThreadId,
        selectedChat.id,
        messageText,
        'text',
        'team'
      );
    } else {
      // Send to main chat
      savedMessage = await chatService.sendMessage(
        selectedChat.id,
        messageText,
        'text',
        'team'
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

  const handleThreadSelect = (threadId: string | null) => {
    setSelectedThreadId(threadId);
  };

  const handleThreadCreated = async (threadId: string) => {
    // Reload threads
    if (selectedChat) {
      const updatedThreads = await chatService.getChatThreads(selectedChat.id);
      setThreads(updatedThreads);

      // Switch to the newly created thread
      setSelectedThreadId(threadId);

      // Manually trigger flow auto-start for the new thread
      const newThread = updatedThreads.find(t => t.id === threadId);
      if (newThread?.tag) {
        const shouldAutoStart = ['return', 'damage', 'defective', 'damaged'].includes(newThread.tag.toLowerCase());
        if (shouldAutoStart) {
          setTimeout(async () => {
            const autoStarted = await flowTriggerService.autoStartFlowIfNeeded(
              threadId,
              newThread.title,
              newThread.tag || undefined
            );

            if (autoStarted) {
              toast.success(`Started ${newThread.tag} resolution flow`);
            }
          }, 500);
        }
      }
    }
  };

  const handleCloseThread = async (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;

    const confirmMessage = `Are you sure you want to close "${thread.title}"? This will permanently delete the thread and its messages.`;
    if (!confirm(confirmMessage)) return;

    const success = await chatService.closeThread(threadId);
    if (success) {
      toast.success('Thread closed');
      // Reload threads
      if (selectedChat) {
        const updatedThreads = await chatService.getChatThreads(selectedChat.id);
        setThreads(updatedThreads);
      }
      // If we were viewing this thread, switch to main chat
      if (selectedThreadId === threadId) {
        setSelectedThreadId(null);
      }
    } else {
      toast.error('Failed to close thread');
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    // Delete uses the same logic as close
    await handleCloseThread(threadId);
  };

  const handleRestartThread = async (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;

    // Restart the conversational flow for this thread
    try {
      toast.info('Restarting conversation flow...');
      await startFlow(threadId);
      toast.success('Flow restarted');
    } catch (error) {
      console.error('Error restarting flow:', error);
      toast.error('Failed to restart flow');
    }
  };

  const profile = selectedChat?.user_profile;
  const userName = profile?.name ||
    (profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.company ||
        (selectedChat?.shopify_installations?.[0]?.store_url?.replace('https://', '').replace('.myshopify.com', '')) ||
        profile?.email?.split('@')[0] ||
        'User');
  const userEmail = profile?.email || '';
  const companyName = profile?.company || null;
  const storeUrl = selectedChat?.shopify_installations?.[0]?.store_url || null;
  const userCreatedAt = selectedChat?.user_profile?.created_at;
  const lastInteraction = selectedChat?.user_assignment?.last_interaction_at;

  // Calculate user's current time based on timezone
  const getUserCurrentTime = () => {
    const now = new Date();
    // Default to UTC if no timezone info
    const hours = now.getUTCHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Display assigned admin name, then fallback to company/store name
  const assignedAdminName = selectedChat?.admin_profile?.name;
  const displaySecondaryLine = assignedAdminName ? `Assigned to: ${assignedAdminName}` : (companyName || storeUrl);

  return (
    <>
      {/* Page Title - Hidden on mobile, visible on desktop */}
      <div className="hidden lg:block mb-6">
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Resolution Center
        </h1>
        <div className="flex items-start sm:items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></span>
          <span>Manage customer support and order issues</span>
        </div>
      </div>

      {/* Horizontal Conversation List with Conversations Button - Mobile Only */}
      <div className="lg:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleConversationList}
            className="flex-shrink-0 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
            title="View all conversations"
          >
            <List className="w-5 h-5" />
          </button>
          {selectedChat && (
            <div className="flex-1 min-w-0">
              <HorizontalConversationList
                chats={chats}
                selectedChatId={selectedChat?.id || null}
                onSelectChat={setSelectedChat}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] relative overflow-hidden">
          {/* Conversations List - Slides in from left on all screen sizes */}
          <div className={`
            ${showConversationList ? 'translate-x-0' : '-translate-x-full'}
            absolute inset-y-0 left-0 z-40
            w-full sm:w-[350px]
            border-r border-gray-200 dark:border-[#3a3a3a]
            flex flex-col
            bg-white dark:bg-dark
            transition-all duration-300 ease-in-out
            h-full
          `}>
            {/* Header with close button */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-[#3a3a3a] min-h-[70px] sm:min-h-[70px]">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Conversations
              </h3>

              {/* X button to close */}
              <button
                onClick={() => setShowConversationList(false)}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation filters and list */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <ConversationFilters
                filters={conversationFilters}
                onFiltersChange={setConversationFilters}
                searchTerm={conversationSearch}
                onSearchChange={setConversationSearch}
              />

              {/* Conversation list */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <ConversationListSkeleton />
                ) : chats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                    <MessageSquare className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No cases yet</p>
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
            </div>
          </div>

      {/* Hidden code - keeping for reference but not rendering */}
      {false && (
          <div>
            {/* Collapsed view - Just avatars when profile is open */}
              <div className="flex flex-col overflow-y-auto">
                {chats.map((chat, index) => {
                  const profile = chat.user_profile;
                  const userName = profile?.name ||
                    profile?.company ||
                      (chat.shopify_installations && chat.shopify_installations.length > 0
                        ? chat.shopify_installations[0].store_url.replace('https://', '').replace('.myshopify.com', '')
                        : profile?.email?.split('@')[0] || 'User');

                  const getInitials = (name: string) => {
                    if (!name || name === 'User') {
                      return 'U';
                    }
                    const parts = name.split(' ').filter(p => p.length > 0);
                    if (parts.length >= 2) {
                      return (parts[0][0] + parts[1][0]).toUpperCase();
                    }
                    return name.substring(0, 2).toUpperCase();
                  };

                  const isSelected = selectedChat?.id === chat.id;
                  const isFirst = index === 0;
                  const isLast = index === chats.length - 1;

                  return (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`relative flex flex-col items-center py-3 px-2 group transition-all duration-200 ${
                        isSelected
                          ? 'bg-gray-100 dark:bg-[#3a3a3a]/50'
                          : 'hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/30'
                      } ${
                        isFirst ? 'pt-4' : ''
                      } ${
                        isLast ? 'pb-4' : ''
                      }`}
                      title={userName}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#E85B81] to-[#E87D55]" />
                      )}
                      <div className="relative mb-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200/80 via-gray-300/70 to-gray-200/60 dark:bg-gradient-to-br dark:from-[#3a3a3a]/50 dark:via-[#4a4a4a]/40 dark:to-[#3a3a3a]/50 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {getInitials(userName)}
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
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 text-center leading-tight">
                        {userName.split(' ').length > 1 ? `${userName.split(' ')[0]} ${userName.split(' ')[1][0]}.` : userName}
                      </span>
                    </button>
                  );
                })}
              </div>
          </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 border-b border-gray-200 dark:border-[#3a3a3a] min-h-[70px]">
              <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                {/* Button to open conversation list - Hidden on mobile since horizontal list has its own button */}
                <button
                  onClick={handleToggleConversationList}
                  className="hidden lg:flex flex-shrink-0 p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
                  title="View all conversations"
                >
                  <List className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 truncate">{userName}</h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{displaySecondaryLine}</p>
                  <div className="hidden sm:flex items-center space-x-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span title="User's current time">
                      User's Current Time: {getUserCurrentTime()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">

                <ChannelDropdown
                  threads={threads}
                  selectedThreadId={selectedThreadId}
                  onThreadSelect={handleThreadSelect}
                  onCreateThread={() => setShowCreateThreadModal(true)}
                  onDeleteThread={handleDeleteThread}
                  onRestartThread={handleRestartThread}
                />
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => setShowTagModal(true)}
                  className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
                  title="Manage tags"
                >
                  <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Info button - toggle user profile sidebar */}
                <button
                  onClick={handleToggleUserProfile}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                    showUserProfile
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a]'
                  }`}
                  title="Toggle info panel"
                >
                  <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Flow Suggestion Banner */}
            {showFlowSuggestion && suggestedFlowId && !activeFlowSession?.is_active && (
              <div className="mx-4 sm:mx-6 mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Suggested Resolution Flow
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      We detected this case might benefit from a guided resolution process. Start the flow to streamline the resolution.
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={async () => {
                        if (suggestedFlowId) {
                          await startFlow(suggestedFlowId);
                          setShowFlowSuggestion(false);
                          toast.success('Resolution flow started');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Start Flow
                    </button>
                    <button
                      onClick={() => setShowFlowSuggestion(false)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 pb-4 space-y-3 sm:space-y-4 bg-gray-50 dark:bg-dark/50">
              {/* Escalation Banner - Shows when agent action is needed */}
              {selectedThreadId && (
                <ThreadEscalationBanner
                  threadId={selectedThreadId}
                  onResolved={() => {
                    // Reload threads to update the conversation list
                    if (selectedChat) {
                      loadThreads();
                    }
                  }}
                />
              )}

              {/* Conversational Flow Container - Shows at the top of messages */}
              {selectedThreadId && activeFlowSession?.is_active && (
                <div className="mb-4 p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/30 rounded-lg">
                  <ConversationalFlowContainer
                    threadId={selectedThreadId}
                    onOpenTemplateModal={(templateIds) => {
                      setShowScenarioTemplate(true);
                    }}
                    onTemplateSelect={(templateContent, templateName) => {
                      setNewMessage(templateContent);
                      toast.success(`"${templateName}" template loaded - ready to edit and send!`);
                      // Focus the textarea
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                      }
                    }}
                    isAdminView={true}
                  />
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-500/20 dark:border-amber-500/30">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      Active Flow: {activeFlow?.name}
                    </span>
                  </div>
                </div>
              )}

              {messages.length === 0 && !activeFlowSession?.is_active ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">No messages yet</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Start working on this case</p>
                  </div>
                </div>
              ) : null}
              {messages.map((message, index) => (
                <React.Fragment key={message.id}>
                  {shouldShowDateLabel(message, messages[index - 1]) && (
                    <div className="flex justify-center my-4">
                      <div className="px-3 py-1 bg-gray-200 dark:bg-[#3a3a3a] rounded-full">
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
                    <div className={`flex ${message.sender === 'team' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[85%] lg:max-w-[75%] xl:max-w-[65%]`}>
                      <div className={`${message.type === 'text' ? 'max-w-full' : 'max-w-md'} ${
                        message.metadata?.isFlowMessage
                          ? 'bg-gray-200 dark:bg-[#3a3a3a] text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-[#4a4a4a]'
                          : message.sender === 'team'
                          ? 'message-bubble-user text-white'
                          : (() => {
                              const currentThread = threads.find(t => t.id === selectedThreadId);
                              const threadColor = currentThread ? getThreadBubbleColor(currentThread.tag) : '';
                              return threadColor
                                ? `bg-gradient-to-br ${threadColor} border text-gray-900 dark:text-white`
                                : 'message-bubble-team text-gray-900 dark:text-white';
                            })()
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
                              : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#3a3a3a] dark:to-[#4a4a4a]'
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
                            <div className="flex items-center space-x-2 bg-white/20 dark:bg-dark/20 rounded-lg p-2">
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
                                className="p-1 hover:bg-white/20 dark:hover:bg-[#2a2a2a]/30 rounded transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                          <div className={`px-2 py-1.5 -mx-px -mb-px flex items-center ${
                            message.sender === 'team'
                              ? 'bg-[#e83653] justify-end'
                              : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#3a3a3a] dark:to-[#4a4a4a]'
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
                          {message.metadata?.isFlowMessage && (
                            <div className="px-3 pt-2 pb-1 border-b border-gray-300 dark:border-[#4a4a4a]">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3" />
                                <span className="text-xs font-medium">Automated Flow</span>
                              </div>
                            </div>
                          )}
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
                            message.metadata?.isFlowMessage
                              ? 'bg-gray-300 dark:bg-[#4a4a4a] justify-end'
                              : message.sender === 'team'
                              ? 'bg-[#e83653] justify-end'
                              : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#3a3a3a] dark:to-[#4a4a4a]'
                          }`}>
                            <span className={`text-[8px] leading-none ${
                              message.metadata?.isFlowMessage
                                ? 'text-gray-600 dark:text-gray-400'
                                : message.sender === 'team' ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'
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
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-200 dark:hover:bg-[#3a3a3a] rounded flex-shrink-0"
                          title="Message actions"
                        >
                          <MoreHorizontal className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        </button>
                        {messageActionsOpen === message.id && (
                          <div
                            ref={messageActionsRef}
                            className="fixed bg-white dark:bg-dark rounded-lg shadow-2xl border border-gray-200 dark:border-[#3a3a3a] py-1 z-[9999] min-w-[140px]"
                            style={{
                              top: (messageRefs.current[message.id]?.getBoundingClientRect().bottom || 0) + 4,
                              right: window.innerWidth - (messageRefs.current[message.id]?.getBoundingClientRect().right || 0)
                            }}
                          >
                            <button
                              onClick={() => {
                                setReplyToMessage(message);
                                setMessageActionsOpen(null);
                                textareaRef.current?.focus();
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#3a3a3a] flex items-center gap-2 text-gray-700 dark:text-gray-300"
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
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#3a3a3a] flex items-center gap-2 text-red-600 dark:text-red-400"
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

            {/* Thread Selector - Hidden */}
            {/* <ThreadSelector
              threads={threads}
              selectedThreadId={selectedThreadId}
              onThreadSelect={handleThreadSelect}
              onCreateThread={() => setShowCreateThreadModal(true)}
              onCloseThread={handleCloseThread}
              isLoading={isLoadingThreads}
            /> */}

            {/* Input */}
            <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 border-t border-gray-200 dark:border-[#3a3a3a]">
              <div className="relative bg-gray-50 dark:bg-dark/50 rounded-xl">
                <div className="min-h-[40px] p-2.5">
                  {replyToMessage && (
                    <div className="mb-2 p-2 bg-gray-50 dark:bg-dark border-l-4 border-gray-400 dark:border-gray-500 rounded flex items-start gap-2">
                      <Reply className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Replying to {replyToMessage.sender === 'user' ? 'user' : 'your'} message</p>
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
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    className="w-full min-h-[24px] max-h-[120px] text-sm text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none focus:ring-0 resize-none placeholder-gray-400 dark:placeholder-gray-500"
                    style={{
                      height: '24px',
                      overflowY: 'hidden'
                    }}
                  />

                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
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
                        onClick={() => setShowScenarioTemplate(true)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
                        title="Email templates"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
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
        ) : isLoading ? (
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 bg-gray-50 dark:bg-dark/50">
            <div className="space-y-4 animate-pulse">
              {/* Team message skeleton */}
              <div className="flex justify-start">
                <div className="flex items-end gap-2 max-w-[85%] lg:max-w-[75%]">
                  <div className="bg-gray-200 dark:bg-[#3a3a3a] rounded-lg p-3 w-64">
                    <div className="h-4 bg-gray-300 dark:bg-[#4a4a4a] rounded mb-2" />
                    <div className="h-4 bg-gray-300 dark:bg-[#4a4a4a] rounded w-3/4" />
                  </div>
                </div>
              </div>

              {/* User message skeleton */}
              <div className="flex justify-end">
                <div className="flex items-end gap-2 max-w-[85%] lg:max-w-[75%]">
                  <div className="bg-gray-200 dark:bg-[#3a3a3a] rounded-lg p-3 w-48">
                    <div className="h-4 bg-gray-300 dark:bg-[#4a4a4a] rounded" />
                  </div>
                </div>
              </div>

              {/* Team message skeleton */}
              <div className="flex justify-start">
                <div className="flex items-end gap-2 max-w-[85%] lg:max-w-[75%]">
                  <div className="bg-gray-200 dark:bg-[#3a3a3a] rounded-lg p-3 w-56">
                    <div className="h-4 bg-gray-300 dark:bg-[#4a4a4a] rounded" />
                  </div>
                </div>
              </div>

              {/* User message skeleton */}
              <div className="flex justify-end">
                <div className="flex items-end gap-2 max-w-[85%] lg:max-w-[75%]">
                  <div className="bg-gray-200 dark:bg-[#3a3a3a] rounded-lg p-3 w-52">
                    <div className="h-4 bg-gray-300 dark:bg-[#4a4a4a] rounded mb-2" />
                    <div className="h-4 bg-gray-300 dark:bg-[#4a4a4a] rounded w-2/3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-dark/50">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No case selected</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose a case from the list to start working</p>
            </div>
          </div>
        )}
      </div>

      {/* Context-Aware Sidebar: Merchant profile in main chat, Customer profile in threads */}
      {selectedChat && !selectedThreadId && (
        <CollapsibleClientProfile
          userId={selectedChat.user_id}
          isExpanded={showUserProfile}
          onClose={() => setShowUserProfile(false)}
        />
      )}

      {selectedChat && selectedThreadId && (
        <CustomerProfileSidebar
          threadId={selectedThreadId}
          userId={selectedChat.user_id}
          isExpanded={showUserProfile}
          onClose={() => setShowUserProfile(false)}
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

        {/* Tag Modal */}
        {showTagModal && selectedChat && (
          <ConversationTagModal
            isOpen={showTagModal}
            onClose={() => setShowTagModal(false)}
            chatId={selectedChat.id}
            onTagsUpdated={() => {
              // Force refresh chat list to show updated tags immediately
              setRefreshTrigger(prev => prev + 1);
            }}
          />
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

        {/* Create Thread Modal */}
        {selectedChat && (
          <CreateThreadModal
            isOpen={showCreateThreadModal}
            onClose={() => {
              setShowCreateThreadModal(false);
              setPendingOrderThreadId(null);
            }}
            chatId={selectedChat.id}
            userId={selectedChat.user_id}
            onThreadCreated={handleThreadCreated}
            initialOrderId={pendingOrderThreadId || undefined}
          />
        )}

        {/* Email Composer Modal */}
        {showEmailComposer && selectedChat && (
          <EmailComposerModal
            isOpen={showEmailComposer}
            onClose={() => setShowEmailComposer(false)}
            threadId={selectedThreadId || ''}
            orderId={linkedOrderId || undefined}
            customerEmail={selectedChat.user_profile?.email || ''}
            customerName={selectedChat.user_profile?.name || selectedChat.user_profile?.company || 'Customer'}
            threadTags={threadTags}
          />
        )}

        {/* Scenario Template Modal */}
        {showScenarioTemplate && selectedChat && (
          <ScenarioTemplateModal
            isOpen={showScenarioTemplate}
            onClose={() => setShowScenarioTemplate(false)}
            onSelectTemplate={(template) => {
              setNewMessage(template);
              setShowScenarioTemplate(false);
            }}
            threadId={selectedThreadId || undefined}
            threadCategory={selectedThreadId ? threads.find(t => t.id === selectedThreadId)?.tag || undefined : undefined}
            orderId={selectedThreadId ? threads.find(t => t.id === selectedThreadId)?.order_id || undefined : undefined}
            userId={selectedChat.user_id}
          />
        )}
    </>
  );
};

export default AdminChat;
