import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  AlertCircle,
  Clock,
  Info,
  Wrench,
  DollarSign,
  Package,
  Crown,
  UserPlus,
  Bell,
  MessageSquare,
  Tag as TagIcon
} from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import {
  ConversationTag,
  conversationTagService,
} from '@/lib/conversationTagService';
import { useAuth } from '@/contexts/AuthContext';

interface ConversationTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  onTagsUpdated: () => void;
}

const iconMap: { [key: string]: React.FC<any> } = {
  AlertCircle,
  Clock,
  Info,
  Wrench,
  DollarSign,
  Package,
  Crown,
  UserPlus,
  Bell,
  MessageSquare,
  Tag: TagIcon,
};

const categoryLabels: { [key: string]: string } = {
  priority: 'Priority',
  type: 'Issue Type',
  status: 'Status',
  segment: 'Customer Segment',
};

export const ConversationTagModal: React.FC<ConversationTagModalProps> = ({
  isOpen,
  onClose,
  chatId,
  onTagsUpdated,
}) => {
  const { user } = useAuth();
  const [tags, setTags] = useState<ConversationTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTags();
      loadAssignedTags();
    }
  }, [isOpen, chatId]);

  const loadTags = async () => {
    try {
      setIsLoading(true);
      const allTags = await conversationTagService.getTags();
      setTags(allTags);
    } catch (error) {
      console.error('Error loading tags:', error);
      toast.error('Failed to load tags');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignedTags = async () => {
    try {
      const assignments = await conversationTagService.getTagsByChat(chatId);
      const assignedIds = new Set(assignments.map((a) => a.tag_id));
      setSelectedTagIds(assignedIds);
    } catch (error) {
      console.error('Error loading assigned tags:', error);
    }
  };

  const toggleTag = (tagId: string) => {
    const newSelected = new Set(selectedTagIds);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedTagIds(newSelected);
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      await conversationTagService.bulkAssignTags(
        chatId,
        Array.from(selectedTagIds),
        user.id
      );
      toast.success('Tags updated successfully');
      onTagsUpdated();
      onClose();
    } catch (error) {
      console.error('Error saving tags:', error);
      toast.error('Failed to update tags');
    } finally {
      setIsSaving(false);
    }
  };

  const groupedTags = tags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as { [key: string]: ConversationTag[] });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tag Conversation" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        ) : (
          <>
            {Object.entries(groupedTags).map(([category, categoryTags]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {categoryLabels[category] || category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {categoryTags.map((tag) => {
                    const IconComponent = iconMap[tag.icon] || TagIcon;
                    const isSelected = selectedTagIds.has(tag.id);

                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`
                          relative flex items-center px-3 py-2.5 rounded-lg border transition-all
                          backdrop-blur-xl bg-white/40 dark:bg-gray-800/40
                          ${
                            isSelected
                              ? 'border-current shadow-lg shadow-black/5 dark:shadow-black/20'
                              : 'border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300/70 dark:hover:border-gray-600/70 hover:shadow-md'
                          }
                        `}
                        style={{
                          background: isSelected
                            ? `linear-gradient(135deg, ${tag.color}18, ${tag.color}08)`
                            : undefined,
                          borderColor: isSelected ? tag.color : undefined,
                        }}
                      >
                        <div
                          className="flex items-center justify-center w-8 h-8 rounded-md mr-2.5 backdrop-blur-sm"
                          style={{
                            backgroundColor: `${tag.color}25`,
                            color: tag.color,
                          }}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {tag.name}
                          </div>
                          {tag.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {tag.description}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div
                            className="flex-shrink-0 ml-2 w-5 h-5 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm"
                            style={{
                              backgroundColor: tag.color,
                            }}
                          >
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Tags'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
