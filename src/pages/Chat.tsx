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
  X,
  Reply
} from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import { Message } from '@/types/chat';
import { useClickOutside } from '@/lib/useClickOutside';
import { useAuth } from '@/contexts/AuthContext';
import { chatService, Chat as ChatType } from '@/lib/chatService';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { MessageSearch } from '@/components/chat/MessageSearch';
import { SearchResults } from '@/components/chat/SearchResults';
import { LoadingSpinner } from '@/components/PageSkeletons';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [messageActionsOpen, setMessageActionsOpen] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageActionsRef = useRef<HTMLDivElement>(null);

  useClickOutside(moreMenuRef, () => setShowMoreMenu(false));
  useClickOutside(messageActionsRef, () => setMessageActionsOpen(null));

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
    if (!newMessage.trim() && !selectedFile) return;
    if (!chat || !user) {
      toast.error('Chat not initialized');
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

  return (
    <div className="max-w-[1050px] mx-auto">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Supplier Chat
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
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
                <MoreHorizontal className="w-5 h-5" />
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
              <LoadingSpinner />
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
          {!isLoading && messages.map((message, index) => (
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
                className={`flex group ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                  <div className={`${message.type === 'text' ? 'max-w-max' : 'max-w-md'} ${
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
                          : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600'
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
                      </div>
                      <div className={`px-2 py-1.5 -mx-px -mb-px flex items-center ${
                        message.sender === 'user'
                          ? 'bg-[#e83653] justify-end'
                          : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600'
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
                        <p className="text-sm whitespace-nowrap">{message.content}</p>
                      </div>
                      <div className={`px-2 py-1.5 -mx-px -mb-px flex items-center ${
                        message.sender === 'user'
                          ? 'bg-[#e83653] justify-end'
                          : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600'
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
                        {message.sender === 'user' && (
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
              {replyToMessage && (
                <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-400 dark:border-gray-500 rounded flex items-start gap-2">
                  <Reply className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Replying to {replyToMessage.sender === 'user' ? 'your' : 'admin'} message</p>
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
              {selectedFile && (
                <div className="mb-2 p-2 bg-white dark:bg-gray-600 rounded-lg flex items-center gap-2">
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
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
                className="w-full min-h-[24px] max-h-[120px] text-sm bg-transparent dark:text-white focus:outline-none resize-none placeholder-gray-400 dark:placeholder-gray-500"
                style={{
                  height: '24px',
                  overflowY: 'hidden'
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
                  disabled={!newMessage.trim() && !selectedFile}
                  className="p-2 rounded-lg transition-all disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-center"
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
  );
};

export default Chat;