import { useState, useEffect, useCallback } from 'react';
import { X, Copy, Check, Mail, Package, RotateCcw, AlertCircle, Truck, FileCheck, MessageSquare, ThumbsUp, Sparkles, Link as LinkIcon, Search, Loader2, Shield, DollarSign, MapPin, AlertTriangle, Edit3, ArrowLeft, ArrowRight, Warehouse, PackageCheck, CheckCircle, ShieldAlert, ChevronDown, ChevronUp, Filter, Tag, Pencil } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { fetchVariableData, replaceVariablesWithTracking, VARIABLE_FALLBACKS, VARIABLE_DISPLAY_NAMES } from '../../lib/templateVariableService';
import { MerchantNoteBox } from './MerchantNoteBox';
import { useAuth } from '../../contexts/AuthContext';

interface ScenarioTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId?: string;
  threadCategory?: string;
  orderId?: string;
  userId?: string;
  recipientEmail?: string;
  onSelectTemplate?: (template: { id: string; name: string }) => void;
}

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  description: string | null;
  subject_line: string;
  body_html: string;
  body_plain: string;
  badges: string[];
  order_status_hints: string[];
  action_required: string | null;
  sort_order: number;
  usage_count: number;
}

interface Template extends EmailTemplate {
  description: string;
  icon: any;
  color: string;
  orderStatus: 'not_shipped' | 'fulfillment' | 'shipped' | 'out_for_delivery' | 'delivered' | 'delivery_exception' | 'product_issue' | 'return' | 'chargeback';
  statusLabel: string;
  statusBadgeColor: 'slate' | 'blue' | 'amber' | 'green' | 'teal' | 'red' | 'orange' | 'purple' | 'crimson';
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

interface Order {
  id: string;
  order_number: string;
  shopify_order_id: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  total_price: number;
  currency: string;
  created_at: string;
}

const PROBLEM_CATEGORIES = [
  { id: 'order_status', label: 'Order Status / Inquiries', icon: Package, color: 'blue' as const },
  { id: 'address_issue', label: 'Address Problems', icon: MapPin, color: 'orange' as const },
  { id: 'shipping', label: 'Shipping & Delivery', icon: Truck, color: 'amber' as const },
  { id: 'delivery_exception', label: 'Delivery Issues / Exceptions', icon: AlertTriangle, color: 'red' as const },
  { id: 'return', label: 'Returns & Exchanges', icon: RotateCcw, color: 'purple' as const },
  { id: 'damaged', label: 'Product Issues - Damaged', icon: AlertCircle, color: 'orange' as const },
  { id: 'defective', label: 'Product Issues - Defective', icon: AlertCircle, color: 'orange' as const },
  { id: 'quality', label: 'Product Issues - Quality', icon: AlertCircle, color: 'orange' as const },
  { id: 'cancel', label: 'Cancellations', icon: X, color: 'slate' as const },
  { id: 'upsell', label: 'Upsell Management', icon: Edit3, color: 'green' as const },
  { id: 'refund', label: 'Refunds', icon: DollarSign, color: 'green' as const },
  { id: 'chargeback', label: 'Chargebacks', icon: ShieldAlert, color: 'crimson' as const }
] as const;

// Multi-Badge Component with Smart Coloring
const TemplateBadges = ({ badges }: { badges: string[] }) => {
  const getBadgeStyle = (badge: string) => {
    // Order State Badges
    if (badge === 'Not Shipped') {
      return 'bg-slate-100 dark:bg-[#2a2a2a] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#4a4a4a]';
    }
    if (badge === 'Shipped') {
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600';
    }
    if (badge === 'Out for Delivery') {
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600';
    }
    if (badge === 'Delivered') {
      return 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-600';
    }
    if (badge === 'Returned to Sender') {
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600';
    }

    // Action Required Badges
    if (badge === 'Need Confirm' || badge === 'Need Reason' || badge === 'Need WEN') {
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600';
    }
    if (badge === 'Notify Supplier') {
      return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-600';
    }

    // Context/Flag Badges
    if (badge === 'Took Upsell') {
      return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600';
    }
    if (badge === 'Invalid Address' || badge === 'Address Issue') {
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-600';
    }
    if (badge === 'Chargeback') {
      return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-600';
    }
    if (badge === 'Delivery Exception') {
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600';
    }
    if (badge === 'Partial Refund' || badge === 'Full Refund') {
      return 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-600';
    }
    if (badge === 'Warranty Issue') {
      return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-600';
    }
    if (badge === 'Expedited') {
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-600';
    }
    if (badge === 'Follow Up') {
      return 'bg-gray-100 dark:bg-dark text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#4a4a4a]';
    }

    // Default
    return 'bg-gray-100 dark:bg-dark text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#4a4a4a]';
  };

  if (!badges || badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge, index) => (
        <span
          key={index}
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border ${getBadgeStyle(badge)}`}
        >
          <Tag className="w-2.5 h-2.5" />
          {badge}
        </span>
      ))}
    </div>
  );
};

const StatusBadge = ({ label, color }: { label: string; color: string }) => {
  const badgeColors = {
    slate: 'bg-slate-100 dark:bg-[#2a2a2a] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#4a4a4a]',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600',
    teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-600',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-600',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-600',
    crimson: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-600'
  };

  const colorClass = badgeColors[color as keyof typeof badgeColors] || badgeColors.slate;

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colorClass}`}>
      {label}
    </span>
  );
};

// Templates are now loaded from the database - see email_templates table
// The hardcoded TEMPLATES array has been removed in favor of database templates

const CATEGORY_LABELS: Record<string, string> = {
  damaged: 'Product Issues',
  defective: 'Product Issues',
  quality: 'Product Issues',
  order_status: 'Order Inquiries',
  shipping: 'Shipping & Delivery',
  delivery_exception: 'Delivery Issues',
  return: 'Returns & Exchanges',
  address_issue: 'Address Problems',
  cancel: 'Cancellations',
  upsell: 'Upsell Management',
  refund: 'Refunds',
  chargeback: 'Chargebacks'
};

export function ScenarioTemplateModal({
  isOpen,
  onClose,
  threadId,
  threadCategory,
  orderId,
  userId: propUserId,
  recipientEmail,
  onSelectTemplate
}: ScenarioTemplateModalProps) {
  const { user } = useAuth();
  const userId = propUserId || user?.id;

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isAssignedToOrder, setIsAssignedToOrder] = useState(false);
  const [populatedSubject, setPopulatedSubject] = useState('');
  const [populatedBody, setPopulatedBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [selectedOrderForTemplate, setSelectedOrderForTemplate] = useState<string>('');
  const [expandedStages, setExpandedStages] = useState<string[]>([]);
  const [dbTemplates, setDbTemplates] = useState<EmailTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [showOrderSelector, setShowOrderSelector] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [fallbackVariables, setFallbackVariables] = useState<string[]>([]);
  const [unresolvedVariables, setUnresolvedVariables] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');

  // Normalize thread category for template matching
  // Maps combined tags to their primary category
  const normalizedThreadCategory = threadCategory === 'cancel_modify' ? 'cancel' : threadCategory;

  // Define loadOrders function before it's used in useEffect
  const loadOrders = useCallback(async () => {
    if (!userId) {
      toast.error('No userId available - cannot load orders');
      return;
    }

    toast.info(`Loading orders for user: ${userId.substring(0, 8)}...`);
    setIsLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('shopify_orders')
        .select('id, order_number, shopify_order_id, customer_first_name, customer_last_name, customer_email, total_price, currency, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        toast.error(`Query error: ${error.message}`);
        throw error;
      }

      // Filter out orders without customer information for better UX
      const ordersWithCustomers = (data || []).filter(order =>
        order.customer_first_name || order.customer_last_name || order.customer_email
      );

      if (ordersWithCustomers.length === 0 && data && data.length > 0) {
        toast.warning(`Found ${data.length} orders but ALL are missing customer data (name/email)`);
      } else if (ordersWithCustomers.length === 0) {
        toast.warning('No orders found in database');
      } else if (ordersWithCustomers.length < (data?.length || 0)) {
        toast.success(`Found ${ordersWithCustomers.length} orders with customer info (${data.length - ordersWithCustomers.length} skipped due to missing data)`);
      } else {
        toast.success(`Found ${ordersWithCustomers.length} orders with customer info`);
      }

      setAllOrders(ordersWithCustomers);
      setOrders(ordersWithCustomers);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoadingOrders(false);
    }
  }, [userId]);

  // Load templates from database
  useEffect(() => {
    async function loadTemplates() {
      setIsLoadingTemplates(true);
      try {
        const { data, error } = await supabase
          .from('email_templates')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setDbTemplates(data || []);
      } catch (error) {
        console.error('Error loading templates:', error);
        toast.error('Failed to load templates');
      } finally {
        setIsLoadingTemplates(false);
      }
    }

    if (isOpen) {
      loadTemplates();
      if (userId && !orderId) {
        loadOrders();
      }
    }
  }, [isOpen, userId, orderId, loadOrders]);

  useEffect(() => {
    if (showOrderSelector && userId && !orderId) {
      toast.info('Populate clicked - loading orders...');
      loadOrders();
    } else if (showOrderSelector && !userId) {
      toast.error('Cannot load orders - no user ID available');
    } else if (showOrderSelector && orderId) {
      toast.info('Order already attached to thread');
    }
  }, [showOrderSelector, loadOrders, userId, orderId]);

  // Helper function to map database category to UI category
  // Templates now use their category directly from the database
  const mapCategoryToUI = (category: string): typeof PROBLEM_CATEGORIES[number]['id'] => {
    // Map the database category to the UI category
    const validCategories: Array<typeof PROBLEM_CATEGORIES[number]['id']> = [
      'order_status', 'address_issue', 'shipping', 'delivery_exception',
      'return', 'damaged', 'defective', 'quality', 'cancel', 'upsell', 'refund', 'chargeback'
    ];

    if (validCategories.includes(category as any)) {
      return category as typeof PROBLEM_CATEGORIES[number]['id'];
    }

    // Map legacy categories
    if (category === 'confirmation') return 'order_status';
    if (category === 'replacement') return 'defective';
    if (category === 'inquiry') return 'order_status';
    if (category === 'thankyou') return 'order_status';

    return 'order_status'; // Default fallback
  };

  // Convert database templates to UI format
  const COMBINED_TEMPLATES = dbTemplates.map(t => ({
    ...t,
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description || t.name,
    subject: t.subject_line,
    body: t.body_plain,
    icon: AlertCircle, // Default icon
    color: 'gray',
    orderStatus: mapCategoryToUI(t.category),
    statusLabel: t.badges?.[0] || 'Template',
    statusBadgeColor: 'slate' as const,
    urgency: 'medium' as const
  }));

  const recommendedTemplates = normalizedThreadCategory
    ? COMBINED_TEMPLATES.filter(t => t.category === normalizedThreadCategory)
    : [];

  const otherTemplates = normalizedThreadCategory
    ? COMBINED_TEMPLATES.filter(t => t.category !== normalizedThreadCategory)
    : COMBINED_TEMPLATES;

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev =>
      prev.includes(stageId)
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    );
  };

  // Group templates by category for better organization
  const groupedTemplates = otherTemplates.reduce((acc, template) => {
    const categoryLabel = CATEGORY_LABELS[template.category] || template.category;
    if (!acc[categoryLabel]) {
      acc[categoryLabel] = [];
    }
    acc[categoryLabel].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  // Define category order for consistent display
  const categoryOrder = [
    'Product Issues',
    'Returns & Exchanges',
    'Order Inquiries',
    'Shipping & Delivery',
    'Delivery Issues',
    'Address Problems',
    'Cancellations',
    'Upsell Management',
    'Refunds',
    'Chargebacks'
  ];

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsAssignedToOrder(false);
    setPopulatedSubject(template.subject);
    setPopulatedBody(template.body);
    setSelectedOrderForTemplate('');
    setShowOrderSelector(false);
    setFallbackVariables([]);
    setUnresolvedVariables([]);
    setIsEditMode(false);
    setEditableSubject('');
    setEditableBody('');
  };

  const handleSyncToOrder = () => {
    console.log('handleSyncToOrder called, userId:', userId, 'orderId:', orderId);
    setShowOrderSelector(true);
  };

  const handleOrderSelection = async (selectedOrderId: string) => {
    setSelectedOrderForTemplate(selectedOrderId);
    setOrderSearchQuery('');
    await handleAssignToOrder(selectedOrderId);
  };

  const handleAssignToOrder = async (orderIdToUse?: string) => {
    const targetOrderId = orderIdToUse || orderId;

    if (!selectedTemplate || !targetOrderId) {
      toast.error('No order selected');
      return;
    }

    setIsLoading(true);
    try {
      const variableData = await fetchVariableData({
        orderId: targetOrderId,
        userId: userId,
        threadId: threadId
      });

      const subjectResult = replaceVariablesWithTracking(selectedTemplate.subject, variableData);
      const bodyResult = replaceVariablesWithTracking(selectedTemplate.body, variableData);

      setPopulatedSubject(subjectResult.content);
      setPopulatedBody(bodyResult.content);
      setEditableSubject(subjectResult.content);
      setEditableBody(bodyResult.content);

      const allFallbacks = [...new Set([...subjectResult.fallbackVariables, ...bodyResult.fallbackVariables])];
      const allUnresolved = [...new Set([...subjectResult.unresolvedVariables, ...bodyResult.unresolvedVariables])];
      setFallbackVariables(allFallbacks);
      setUnresolvedVariables(allUnresolved);

      setIsAssignedToOrder(true);
      setShowOrderSelector(false);
    } catch (error) {
      console.error('Error assigning to order:', error);
      toast.error('Failed to load order data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const subjectToUse = isEditMode ? editableSubject : populatedSubject;
      const bodyToUse = isEditMode ? editableBody : populatedBody;
      const emailContent = `Subject: ${subjectToUse}\n\n${bodyToUse}`;
      await navigator.clipboard.writeText(emailContent);
      setCopied(true);
      toast.success('Email copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const renderTextWithVariables = (text: string) => {
    const { hasNote, noteContent, textBeforeNote, textAfterNote } = parseMerchantNote(text);

    const renderTextPart = (textPart: string) => {
      const parts = textPart.split(/(\{\{[^}]+\}\})/g);
      return parts.map((part, index) => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
          const variableName = part.slice(2, -2);
          return (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-mono"
            >
              <Sparkles className="w-3 h-3" />
              {variableName}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      });
    };

    if (hasNote) {
      return (
        <>
          {renderTextPart(textBeforeNote)}
          <MerchantNoteBox type="warning">{noteContent}</MerchantNoteBox>
          {textAfterNote && renderTextPart(textAfterNote)}
        </>
      );
    }

    return renderTextPart(text);
  };

  const parseMerchantNote = (text: string) => {
    const merchantNoteRegex = /\[MERCHANT NOTE:([^\]]+)\]/s;
    const match = text.match(merchantNoteRegex);

    if (match) {
      const noteContent = match[1].trim();
      const textBeforeNote = text.substring(0, match.index);
      let textAfterNote = text.substring(match.index! + match[0].length);

      const exampleRegex = /^\s*Example:\s*"([^"]+)"/;
      const exampleMatch = textAfterNote.match(exampleRegex);

      let fullNoteContent = noteContent;
      if (exampleMatch) {
        fullNoteContent = noteContent + '\n\nExample: "' + exampleMatch[1].trim() + '"';
        textAfterNote = textAfterNote.substring(exampleMatch[0].length);
      }

      return {
        hasNote: true,
        noteContent: fullNoteContent,
        textBeforeNote,
        textAfterNote
      };
    }

    return { hasNote: false, noteContent: '', textBeforeNote: text, textAfterNote: '' };
  };

  const renderPopulatedText = (text: string) => {
    const { hasNote, noteContent, textBeforeNote, textAfterNote } = parseMerchantNote(text);

    const renderTextPart = (textPart: string) => {
      if (fallbackVariables.length === 0 && unresolvedVariables.length === 0) {
        return textPart;
      }

      const fallbackValues = Object.values(VARIABLE_FALLBACKS);
      const escapedFallbacks = fallbackValues.map(f => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const fallbackPattern = new RegExp(`(${escapedFallbacks.join('|')}|\\{\\{[^}]+\\}\\})`, 'g');

      const parts = textPart.split(fallbackPattern);

      return parts.map((part, index) => {
        if (fallbackValues.includes(part)) {
          return (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs border border-red-200 dark:border-red-800"
            >
              <AlertCircle className="w-3 h-3" />
              {part}
            </span>
          );
        }
        if (part.startsWith('{{') && part.endsWith('}}')) {
          return (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs border border-red-200 dark:border-red-800"
            >
              <AlertCircle className="w-3 h-3" />
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      });
    };

    if (hasNote) {
      return (
        <>
          {renderTextPart(textBeforeNote)}
          <MerchantNoteBox type="warning">{noteContent}</MerchantNoteBox>
          {textAfterNote && renderTextPart(textAfterNote)}
        </>
      );
    }

    return renderTextPart(text);
  };

  const getWarningCount = () => {
    return fallbackVariables.length + unresolvedVariables.length;
  };

  const getWarningFields = () => {
    const fields: string[] = [];
    fallbackVariables.forEach(v => {
      fields.push(VARIABLE_DISPLAY_NAMES[v] || v.replace(/_/g, ' '));
    });
    unresolvedVariables.forEach(v => {
      fields.push(VARIABLE_DISPLAY_NAMES[v] || v.replace(/_/g, ' '));
    });
    return fields;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#333333] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedTemplate ? selectedTemplate.name : 'Email Templates'}
            </h2>
            {selectedTemplate && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedTemplate.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedTemplate ? (
            <div className="p-6">
              {/* Recommended Templates */}
              {recommendedTemplates.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`h-px flex-1 ${
                      recommendedTemplates[0]?.color === 'red' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                      recommendedTemplates[0]?.color === 'orange' ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                      recommendedTemplates[0]?.color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-400' :
                      recommendedTemplates[0]?.color === 'green' ? 'bg-gradient-to-r from-green-500 to-green-400' :
                      recommendedTemplates[0]?.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                      recommendedTemplates[0]?.color === 'yellow' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                      'bg-gradient-to-r from-gray-500 to-gray-400'
                    }`}></div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                      Recommended for this thread
                    </h3>
                    <div className={`h-px flex-1 ${
                      recommendedTemplates[0]?.color === 'red' ? 'bg-gradient-to-l from-red-500 to-red-400' :
                      recommendedTemplates[0]?.color === 'orange' ? 'bg-gradient-to-l from-orange-500 to-orange-400' :
                      recommendedTemplates[0]?.color === 'purple' ? 'bg-gradient-to-l from-purple-500 to-purple-400' :
                      recommendedTemplates[0]?.color === 'green' ? 'bg-gradient-to-l from-green-500 to-green-400' :
                      recommendedTemplates[0]?.color === 'blue' ? 'bg-gradient-to-l from-blue-500 to-blue-400' :
                      recommendedTemplates[0]?.color === 'yellow' ? 'bg-gradient-to-l from-yellow-500 to-yellow-400' :
                      'bg-gradient-to-l from-gray-500 to-gray-400'
                    }`}></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recommendedTemplates.map((template) => {
                      const Icon = template.icon;
                      return (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className="p-4 border-2 border-gray-300 dark:border-[#4a4a4a] bg-white dark:bg-dark rounded-lg hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md transition-all text-left group focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-0 relative"
                        >
                          {/* Badges positioned top right, wrap if needed (hidden on mobile) */}
                          <div className="hidden md:flex absolute top-3 right-3 flex-wrap justify-end gap-1.5 max-w-[200px]">
                            <TemplateBadges badges={template.badges} />
                          </div>

                          <div className="flex items-start gap-3 md:pr-44">
                            <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                                  {template.name}
                                </h3>
                                <span className="px-2 py-0.5 text-[10px] rounded-md bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 font-semibold uppercase">
                                  Match
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                {template.description}
                              </p>
                            </div>
                          </div>

                          {/* On small screens, badges move below */}
                          <div className="md:hidden mt-3 border-t border-gray-100 dark:border-[#333333] pt-3">
                            <TemplateBadges badges={template.badges} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Separator */}
              {recommendedTemplates.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Browse All Templates
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
                  </div>
                </div>
              )}

              {/* Accordion Navigation */}
              <div className="space-y-3">
                {PROBLEM_CATEGORIES.map((stage) => {
                  const StageIcon = stage.icon;
                  const stageTemplates = COMBINED_TEMPLATES.filter(t => t.orderStatus === stage.id);
                  const isExpanded = expandedStages.includes(stage.id);

                  // Clean, minimal design - no colored backgrounds
                  const colors = {
                    header: 'bg-white dark:bg-dark/50',
                    headerHover: 'hover:bg-gray-50 dark:hover:bg-[#262626]',
                    icon: 'text-gray-500 dark:text-gray-400',
                    iconBg: 'bg-gray-100 dark:bg-dark',
                    text: 'text-gray-900 dark:text-white',
                    badge: 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400',
                    templateHover: 'hover:bg-gray-50 dark:hover:bg-[#262626]/30'
                  };

                  return (
                    <div key={stage.id} className="border border-gray-200 dark:border-[#333333] rounded-lg overflow-hidden">
                      {/* Accordion Header */}
                      <button
                        onClick={() => toggleStage(stage.id)}
                        className={`w-full px-4 py-3.5 flex items-center justify-between ${colors.header} ${colors.headerHover} transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-0 group`}
                      >
                        <div className="flex items-center gap-3">
                          <StageIcon className={`w-4.5 h-4.5 ${colors.icon} group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors`} />
                          <span className={`font-medium text-sm ${colors.text}`}>
                            {stage.label}
                          </span>
                          <span className={`px-2 py-0.5 text-[11px] font-medium rounded-md ${colors.badge}`}>
                            {stageTemplates.length}
                          </span>
                        </div>
                        <ChevronDown className={`w-4 h-4 ${colors.icon} transition-all ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="px-3 py-3 bg-gray-50/50 dark:bg-dark/30 border-t border-gray-100 dark:border-[#333333]/50 space-y-1.5">
                          {stageTemplates.map((template) => {
                            const Icon = template.icon;
                            return (
                              <button
                                key={template.id}
                                onClick={() => handleSelectTemplate(template)}
                                className="w-full p-3 bg-white dark:bg-dark border border-gray-200 dark:border-[#333333] rounded-lg hover:border-gray-300 dark:hover:border-[#4a4a4a] hover:shadow-sm transition-all text-left group focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-0 relative"
                              >
                                {/* Badges positioned top right, wrap if needed (hidden on mobile) */}
                                <div className="hidden md:flex absolute top-2.5 right-2.5 flex-wrap justify-end gap-1.5 max-w-[180px]">
                                  <TemplateBadges badges={template.badges} />
                                </div>

                                <div className="flex items-start gap-3 md:pr-40">
                                  <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-sm text-gray-900 dark:text-white mb-0.5">
                                      {template.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                      {template.description}
                                    </p>
                                  </div>
                                </div>

                                {/* On small screens, badges move below */}
                                <div className="md:hidden mt-2 border-t border-gray-100 dark:border-[#333333] pt-2">
                                  <TemplateBadges badges={template.badges} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Subject Line */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#2a2a2a]/50">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Subject Line
                  </label>
                  {isAssignedToOrder && (
                    <button
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        isEditMode
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#4a4a4a]'
                      }`}
                    >
                      <Pencil className="w-3 h-3" />
                      {isEditMode ? 'Editing' : 'Edit'}
                    </button>
                  )}
                </div>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editableSubject}
                    onChange={(e) => setEditableSubject(e.target.value)}
                    className="w-full px-3 py-2 text-gray-900 dark:text-white font-medium bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-gray-900 dark:text-white font-medium">
                    {isAssignedToOrder ? renderPopulatedText(populatedSubject) : renderTextWithVariables(populatedSubject)}
                  </div>
                )}
              </div>

              {/* Email Body */}
              <div className="flex-1 p-6 overflow-y-auto">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 block">
                  Email Body
                </label>
                {isEditMode ? (
                  <textarea
                    value={editableBody}
                    onChange={(e) => setEditableBody(e.target.value)}
                    className="w-full h-full min-h-[300px] px-3 py-2 text-gray-700 dark:text-gray-300 text-sm leading-relaxed bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                    {isAssignedToOrder ? renderPopulatedText(populatedBody) : renderTextWithVariables(populatedBody)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <div className="border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#2a2a2a]/50">
            {/* Order Search Section - Only visible when showOrderSelector is true */}
            {!isAssignedToOrder && !orderId && showOrderSelector && (
              <div className="px-6 py-4 border-b border-gray-200 dark:border-[#333333]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Attach an order to this template
                    </label>
                    <button
                      onClick={() => {
                        setShowOrderSelector(false);
                        setSelectedOrderForTemplate('');
                        setOrderSearchQuery('');
                      }}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>

                  {isLoadingOrders ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : allOrders.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <Package className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No orders found</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Type to search orders..."
                          value={orderSearchQuery}
                          onChange={(e) => {
                            const search = e.target.value;
                            setOrderSearchQuery(search);
                            if (search.toLowerCase()) {
                              const filtered = allOrders.filter(order =>
                                order.order_number.toLowerCase().includes(search.toLowerCase())
                              );
                              setOrders(filtered);
                            } else {
                              setOrders(allOrders);
                            }
                          }}
                          className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-dark dark:text-white text-sm transition-all"
                        />
                      </div>

                      {orderSearchQuery.length > 0 && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg max-h-[200px] overflow-y-auto bg-white dark:bg-dark shadow-lg z-10">
                          {orders.length === 0 ? (
                            <div className="flex items-center justify-center py-4">
                              <div className="text-center">
                                <Package className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-1" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">No matching orders</p>
                              </div>
                            </div>
                          ) : (
                            orders.map((order) => (
                              <button
                                key={order.id}
                                onClick={() => handleOrderSelection(order.id)}
                                className="w-full px-4 py-3 flex items-center justify-between transition-all border-b border-gray-200 dark:border-[#333333] last:border-b-0 text-left group focus:outline-none hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg transition-colors bg-gray-100 dark:bg-[#2a2a2a] group-hover:bg-red-100 dark:group-hover:bg-red-900/30">
                                    <Package className="w-4 h-4 transition-colors text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-red-900 dark:group-hover:text-red-100">
                                      {order.order_number}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                      {order.customer_first_name || order.customer_last_name ? (
                                        [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ')
                                      ) : order.customer_email ? (
                                        order.customer_email
                                      ) : (
                                        'Guest Customer'
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-900 dark:text-gray-100">
                                    ${order.total_price?.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {new Date(order.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  setIsAssignedToOrder(false);
                  setCopied(false);
                  setSelectedOrderForTemplate('');
                  setShowOrderSelector(false);
                  setOrderSearchQuery('');
                  setFallbackVariables([]);
                  setUnresolvedVariables([]);
                  setIsEditMode(false);
                }}
                className="group btn btn-secondary flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 btn-icon btn-icon-back" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-3">
                {/* Warning for fallback/unresolved variables */}
                {isAssignedToOrder && getWarningCount() > 0 && !isEditMode && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      {getWarningCount()} field{getWarningCount() > 1 ? 's' : ''} need{getWarningCount() === 1 ? 's' : ''} attention
                    </span>
                  </div>
                )}

                {isAssignedToOrder || showOrderSelector ? (
                  <button
                    onClick={() => {
                      if (isAssignedToOrder) {
                        handleCopyToClipboard();
                      } else if (selectedOrderForTemplate) {
                        handleAssignToOrder(selectedOrderForTemplate);
                      }
                    }}
                    disabled={!isAssignedToOrder && !selectedOrderForTemplate}
                    className={`group btn ${
                      isAssignedToOrder || selectedOrderForTemplate
                        ? 'btn-primary'
                        : 'btn-secondary opacity-50 cursor-not-allowed'
                    } flex items-center gap-2`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 btn-icon animate-spin" />
                        Loading...
                      </>
                    ) : copied ? (
                      <>
                        <Check className="w-4 h-4 btn-icon" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 btn-icon" />
                        Copy to Clipboard
                      </>
                    )}
                  </button>
                ) : !orderId ? (
                  <button
                    onClick={handleSyncToOrder}
                    className="group btn btn-primary flex items-center gap-2"
                  >
                    Populate
                    <ArrowRight className="w-4 h-4 btn-icon btn-icon-arrow" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleAssignToOrder()}
                    disabled={isLoading}
                    className="group btn btn-primary flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 btn-icon animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Populate
                        <ArrowRight className="w-4 h-4 btn-icon btn-icon-arrow" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
