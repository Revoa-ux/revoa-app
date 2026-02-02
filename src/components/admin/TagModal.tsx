import React, { useState, useEffect } from 'react';
import { X, Plus, Tag, Check } from 'lucide-react';
import { toast } from '../../lib/toast';

interface TagModalProps {
  onClose: () => void;
  onAddTag: (tag: string) => void;
  existingTags: string[];
}

export const TagModal: React.FC<TagModalProps> = ({
  onClose,
  onAddTag,
  existingTags
}) => {
  const [newTag, setNewTag] = useState('');
  const [recentTags, setRecentTags] = useState<string[]>([]);

  useEffect(() => {
    // Load recent tags from localStorage
    const stored = localStorage.getItem('recentTags');
    if (stored) {
      setRecentTags(JSON.parse(stored));
    }
  }, []);

  const handleAddTag = () => {
    if (!newTag.trim()) return;

    // Add tag
    onAddTag(newTag.trim());

    // Update recent tags
    const updatedTags = [
      newTag.trim(),
      ...recentTags.filter(tag => tag !== newTag.trim())
    ].slice(0, 10); // Keep only 10 most recent tags
    
    setRecentTags(updatedTags);
    localStorage.setItem('recentTags', JSON.stringify(updatedTags));
    
    setNewTag('');
    toast.success('Tag added successfully');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Add Tag</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Tag
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter tag name"
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
              />
            </div>
          </div>

          {recentTags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Tags</h4>
              <div className="flex flex-wrap gap-2">
                {recentTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => onAddTag(tag)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      existingTags.includes(tag)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    disabled={existingTags.includes(tag)}
                  >
                    {tag}
                    {existingTags.includes(tag) && (
                      <Check className="w-4 h-4 ml-1.5 text-gray-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className="btn btn-primary"
            >
              <Plus className="btn-icon" />
              Add Tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};