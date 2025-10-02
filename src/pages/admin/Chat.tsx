import React, { useState, useEffect, useRef } from 'react';
import {
  SortAsc,
  Mail,
  Phone,
  Building2,
  Edit3,
  ChevronRight,
  Search,
  Filter,
  ChevronDown,
  Check,
  User,
  Loader2,
  MessageSquare,
  Plus,
  VolumeX,
  Volume2,
  Archive,
  Flag,
  Trash2,
  Download
} from 'lucide-react'; // eslint-disable-next-line @typescript-eslint/no-unused-vars
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import { Message } from '@/types/chat';
import { mockMessages } from '@/data/mockMessages';
import { useClickOutside } from '@/lib/useClickOutside';
import { FileUploadModal } from '@/components/chat/FileUploadModal';
import { ChatInput } from '@/components/chat/ChatInput';
import { TagModal } from '@/components/admin/TagModal';

interface AssignedUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  registrationDate: string;
  totalTransactions: number;
  storeRevenue: number;
  averageUnitsPerDay: number;
  invoiceCount: number;
  status: 'active' | 'inactive' | 'pending';
  lastActive: string;
  tags?: string[];
  notes?: string;
  unreadMessages?: number;
}

const mockAssignedUsers: AssignedUser[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1 (555) 123-4567',
    company: 'Tech Gadgets Store',
    registrationDate: '2024-01-15',
    totalTransactions: 12500,
    storeRevenue: 45000,
    averageUnitsPerDay: 12.5,
    invoiceCount: 45,
    status: 'active',
    lastActive: '2024-03-20T15:30:00Z',
    tags: ['VIP', 'High Volume'],
    notes: 'Prefers communication via email. Regular bulk orders.',
    unreadMessages: 3
  }
];

export default function AdminChat() {
  const [selectedUser, setSelectedUser] = useState<AssignedUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterOption, setFilterOption] = useState<'all' | 'unread' | 'tag'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showTagsMenu, setShowTagsMenu] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    position: { x: number; y: number };
    userId: string;
  }>({
    show: false,
    position: { x: 0, y: 0 },
    userId: ''
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const tagsMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(contextMenuRef, () => setContextMenu(prev => ({ ...prev, show: false })));
  useClickOutside(filterDropdownRef, () => setShowFilterDropdown(false));
  useClickOutside(tagsMenuRef, () => setShowTagsMenu(false));

  useEffect(() => {
    if (selectedUser) {
      setIsLoading(true);
      setNoteText(selectedUser.notes || '');
      setTimeout(() => {
        setMessages(mockMessages);
        setIsLoading(false);
      }, 1000);
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleContextMenu = (e: React.MouseEvent, userId: string) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      position: { x: e.clientX, y: e.clientY },
      userId
    });
  };

  const handleContextMenuAction = (action: string) => {
    setContextMenu(prev => ({ ...prev, show: false }));
    
    switch (action) {
      case 'mute':
        setIsMuted(!isMuted);
        toast.success(isMuted ? 'Notifications unmuted' : 'Notifications muted');
        break;
      case 'archive':
        toast.success('Chat archived');
        break;
      case 'report':
        toast.success('Report submitted');
        break;
      case 'clear':
        if (window.confirm('Are you sure you want to clear all messages? This cannot be undone.')) {
          setMessages([]);
          toast.success('Chat cleared');
        }
        break;
      case 'export':
        toast.success('Chat history exported');
        break;
    }
  };

  const handleSendMessage = (content: string, type: Message['type'] = 'text') => {
    if (!content.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      type,
      sender: 'team',
      timestamp: new Date(),
      status: 'sending',
      statusTimeline: {
        sent: new Date()
      }
    };

    setMessages([...messages, newMessage]);
  };

  const handleSendFile = async (file: File) => {
    toast.success('File sent successfully');
  };

  const handleSendInvoice = async (file: File) => {
    toast.success('Invoice sent successfully');
  };

  const handleSaveNote = () => {
    if (selectedUser) {
      toast.success('Note saved successfully');
      setEditingNote(false);
    }
  };

  const filteredUsers = mockAssignedUsers.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = 
      filterOption === 'all' ||
      (filterOption === 'unread' && (user.unreadMessages || 0) > 0) ||
      (filterOption === 'tag' && selectedTag && user.tags?.includes(selectedTag));

    return matchesSearch && matchesFilter;
  });

  const allTags = Array.from(
    new Set(
      mockAssignedUsers
        .flatMap(user => user.tags || [])
        .filter(Boolean)
    )
  );

  return (
    <div className="max-w-[1600px] mx-auto mt-2">
      <div className="h-[calc(100vh-4.25rem)] flex rounded-xl border border-gray-200 overflow-hidden">
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col max-h-full">
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
              />
            </div>

            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center">
                  <Filter className="w-4 h-4 text-gray-400 mr-2" />
                  <span>
                    {filterOption === 'all' ? 'All Messages' :
                     filterOption === 'unread' ? 'Unread Messages' :
                     filterOption === 'tag' ? `Tag: ${selectedTag}` : 'Filter'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 transition-transform duration-200" 
                  style={{ transform: showFilterDropdown ? 'rotate(180deg)' : 'rotate(0)' }}
                />
              </button>

              {showFilterDropdown && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button
                    onClick={() => {
                      setFilterOption('all');
                      setSelectedTag(null);
                      setShowFilterDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                  >
                    <span>All Messages</span>
                    {filterOption === 'all' && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                  <button
                    onClick={() => {
                      setFilterOption('unread');
                      setSelectedTag(null);
                      setShowFilterDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                  >
                    <span>Unread Messages</span>
                    {filterOption === 'unread' && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowTagsMenu(!showTagsMenu)}
                      className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                    >
                      <span>Filter by Tag</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 transition-transform duration-200"
                        style={{ transform: showTagsMenu ? 'rotate(90deg)' : 'rotate(0)' }}
                      />
                    </button>
                    
                    {showTagsMenu && (
                      <div 
                        ref={tagsMenuRef}
                        className="absolute left-full top-0 ml-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                        style={{
                          transformOrigin: 'top left',
                          animation: 'dropdown-in 0.2s ease-out'
                        }}
                      >
                        {allTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => {
                              setFilterOption('tag');
                              setSelectedTag(tag);
                              setShowTagsMenu(false);
                              setShowFilterDropdown(false);
                            }}
                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 group"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-gray-400 transition-colors" />
                              <span>{tag}</span>
                            </div>
                            {filterOption === 'tag' && selectedTag === tag && (
                              <Check className="w-4 h-4 text-primary-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                onContextMenu={(e) => handleContextMenu(e, user.id)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                  selectedUser?.id === user.id ? 'bg-gray-50' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    {user.unreadMessages && user.unreadMessages > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-medium">{user.unreadMessages}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{user.name}</h3>
                      <span className="text-xs text-gray-500">
                        {new Date(user.lastActive).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      Last message preview goes here...
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white max-h-full">
          {selectedUser ? (
            <>
              <div className="flex-1 flex min-h-0">
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                      </div>
                    ) : (
                      <>
                        {messages.map((message) => (
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
                              <div className="text-xs mt-1 text-gray-400">
                                {new Date(message.timestamp).toLocaleTimeString([], {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  <ChatInput
                    onSendMessage={handleSendMessage}
                    onSendFile={handleSendFile}
                    onSendInvoice={handleSendInvoice} // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  />
                </div>

                <div className="w-80 border-l border-gray-200 bg-white flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-6">
                      <div className="flex flex-col items-center mb-4">
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                          <User className="w-8 h-8 text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">{selectedUser.name}</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <a href={`mailto:${selectedUser.email}`} className="text-sm text-primary-600 hover:text-primary-700">
                            {selectedUser.email}
                          </a>
                        </div>
                        {selectedUser.phone && (
                          <div className="flex items-center space-x-3">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <a href={`tel:${selectedUser.phone}`} className="text-sm text-primary-600 hover:text-primary-700">
                              {selectedUser.phone}
                            </a>
                          </div>
                        )}
                        {selectedUser.company && (
                          <div className="flex items-center space-x-3">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{selectedUser.company}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Registration Date</span>
                          <span className="font-medium text-gray-900">
                            {new Date(selectedUser.registrationDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Transaction Volume</span>
                          <span className="font-medium text-gray-900">
                            ${selectedUser.totalTransactions.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Store Revenue</span>
                          <span className="font-medium text-gray-900">
                            ${selectedUser.storeRevenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Avg Units/Day</span>
                          <span className="font-medium text-gray-900">
                            {selectedUser.averageUnitsPerDay.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Total Invoices</span>
                          <span className="font-medium text-gray-900">
                            {selectedUser.invoiceCount}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-medium text-gray-900">Tags</h3>
                          <button 
                            onClick={() => setShowTagModal(true)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedUser?.tags?.map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-medium text-gray-900">Notes</h3>
                          <button
                            onClick={() => setEditingNote(!editingNote)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                        {editingNote ? (
                          <div className="space-y-3">
                            <textarea
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              rows={4}
                            />
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => setEditingNote(false)}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveNote}
                                className="px-3 py-1.5 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">
                            {selectedUser.notes || 'No notes added yet.'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a User</h3>
                <p className="text-gray-500">Choose a user from the list to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {contextMenu.show && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            top: contextMenu.position.y,
            left: contextMenu.position.x,
            zIndex: 50
          }}
          className="w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
        >
          <button
            onClick={() => handleContextMenuAction('mute')}
            className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
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
            onClick={() => handleContextMenuAction('archive')}
            className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
          >
            <Archive className="w-4 h-4 mr-3" />
            Archive Chat
          </button>
          <button
            onClick={() => handleContextMenuAction('report')}
            className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
          >
            <Flag className="w-4 h-4 mr-3" />
            Report Issue
          </button>
          <button
            onClick={() => handleContextMenuAction('clear')}
            className="flex items-center w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-3" />
            Clear Messages
          </button>
          <button
            onClick={() => handleContextMenuAction('export')}
            className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-3" />
            Export Chat
          </button>
        </div>
      )}

      {showUploadModal && (
        <FileUploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={(file) => {
            handleSendFile(file);
            setShowUploadModal(false);
          }}
        />
      )}

      {showTagModal && selectedUser && (
        <TagModal
          onClose={() => setShowTagModal(false)}
          onAddTag={(tag) => {
            const updatedUser = {
              ...selectedUser,
              tags: [...(selectedUser.tags || []), tag]
            };
            setSelectedUser(updatedUser);
            setShowTagModal(false);
          }}
          existingTags={selectedUser.tags || []}
        />
      )}
    </div>
  );
}