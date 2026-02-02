import React, { useState, useEffect } from 'react';
import { X, Save, Eye, AlertCircle, Search, Tag, Loader2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from '@/components/Modal';
import { toast } from '../../lib/toast';
import { supabase } from '@/lib/supabase';

interface Template {
  id: string;
  template_name: string;
  template_category: string;
  thread_tags: string[];
  subject_line: string;
  body_text: string;
  usage_count: number;
  last_used_at: string | null;
  is_active: boolean;
  display_order: number;
}

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  productId: string;
  productName: string;
}

export function TemplateEditorModal({
  isOpen,
  onClose,
  userId,
  productId,
  productName,
}: TemplateEditorModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    subject_line: '',
    body_text: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, productId]);

  useEffect(() => {
    filterTemplates();
  }, [searchTerm, selectedCategory, templates]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_response_templates')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', userId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.subject_line.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.body_text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.template_category === selectedCategory);
    }

    setFilteredTemplates(filtered);
  };

  const categories = [
    { value: 'all', label: 'All Templates', count: templates.length },
    { value: 'return_request', label: 'Return Requests', count: templates.filter(t => t.template_category === 'return_request').length },
    { value: 'replacement', label: 'Replacements', count: templates.filter(t => t.template_category === 'replacement').length },
    { value: 'order_status', label: 'Order Status', count: templates.filter(t => t.template_category === 'order_status').length },
    { value: 'delivery_exception', label: 'Delivery Issues', count: templates.filter(t => t.template_category === 'delivery_exception').length },
    { value: 'damaged', label: 'Damaged Items', count: templates.filter(t => t.template_category === 'damaged').length },
    { value: 'quality_complaint', label: 'Quality Issues', count: templates.filter(t => t.template_category === 'quality_complaint').length },
    { value: 'refund_request', label: 'Refunds', count: templates.filter(t => t.template_category === 'refund_request').length },
  ];

  const handleEditTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setEditForm({
      subject_line: template.subject_line,
      body_text: template.body_text,
    });
    setIsEditing(true);
    setShowPreview(false);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('email_response_templates')
        .update({
          subject_line: editForm.subject_line,
          body_text: editForm.body_text,
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      toast.success('Template updated successfully');
      setIsEditing(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (template: Template) => {
    try {
      const { error } = await supabase
        .from('email_response_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;

      toast.success(`Template ${template.is_active ? 'deactivated' : 'activated'}`);
      fetchTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Failed to update template');
    }
  };

  const formatUsageInfo = (template: Template) => {
    if (template.usage_count === 0) return 'Never used';
    const lastUsed = template.last_used_at
      ? new Date(template.last_used_at).toLocaleDateString()
      : 'Unknown';
    return `Used ${template.usage_count} times • Last: ${lastUsed}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-[#3a3a3a] pb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Email Templates
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {productName}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar */}
            <div className="col-span-3 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white"
                />
              </div>

              {/* Categories */}
              <div className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors flex items-center justify-between ${
                      selectedCategory === category.value
                        ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'
                    }`}
                  >
                    <span>{category.label}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {category.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900 dark:text-blue-100">
                    <p className="font-medium mb-1">Template Variables</p>
                    <p className="text-blue-700 dark:text-blue-300">
                      Use {`{{variable_name}}`} syntax. Variables are populated from order data and product configuration.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="col-span-9">
              {isEditing && selectedTemplate ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedTemplate.template_name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        {showPreview ? 'Hide' : 'Show'} Preview
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setSelectedTemplate(null);
                        }}
                        className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTemplate}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className={showPreview ? 'grid grid-cols-2 gap-4' : ''}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Subject Line
                        </label>
                        <input
                          type="text"
                          value={editForm.subject_line}
                          onChange={(e) => setEditForm({ ...editForm, subject_line: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email Body
                        </label>
                        <textarea
                          value={editForm.body_text}
                          onChange={(e) => setEditForm({ ...editForm, body_text: e.target.value })}
                          rows={20}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white font-mono text-sm resize-none"
                        />
                      </div>
                    </div>

                    {showPreview && (
                      <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg p-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">PREVIEW (with sample data)</p>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {editForm.subject_line.replace(/\{\{(.*?)\}\}/g, '[SAMPLE_$1]')}
                          </h4>
                          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {editForm.body_text.replace(/\{\{(.*?)\}\}/g, '[SAMPLE_$1]')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* List Mode */
                <div className="space-y-3">
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <p>No templates found</p>
                    </div>
                  ) : (
                    filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="border border-gray-200 dark:border-[#3a3a3a] rounded-lg overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {template.template_name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                {template.thread_tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-dark text-xs text-gray-700 dark:text-gray-300 rounded"
                                  >
                                    <Tag className="w-3 h-3" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleActive(template)}
                                className={`text-xs px-2 py-1 rounded ${
                                  template.is_active
                                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                    : 'bg-gray-100 dark:bg-dark text-gray-500 dark:text-gray-400'
                                }`}
                              >
                                {template.is_active ? 'Active' : 'Inactive'}
                              </button>
                              <button
                                onClick={() => handleEditTemplate(template)}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setExpandedTemplate(expandedTemplate === template.id ? null : template.id)
                                }
                                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform ${expandedTemplate === template.id ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {formatUsageInfo(template)}
                          </p>

                          {expandedTemplate === template.id && (
                            <div className="mt-4 pt-6 border-t border-gray-200 dark:border-[#3a3a3a]">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Subject: {template.subject_line}
                              </p>
                              <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap mt-2 p-3 bg-gray-50 dark:bg-dark rounded-lg">
                                {template.body_text}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
