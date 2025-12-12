import { useState, useEffect } from 'react';
import { X, Copy, Check, Mail, Package, RotateCcw, AlertCircle, Truck, FileCheck, MessageSquare, ThumbsUp, Sparkles, Link as LinkIcon, Search, Loader2, Shield, DollarSign, MapPin, AlertTriangle, Edit3, ArrowLeft, ArrowRight, Warehouse, PackageCheck, CheckCircle, ShieldAlert, ChevronDown, ChevronUp, Filter, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { fetchVariableData, replaceVariables } from '../../lib/templateVariableService';

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
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600';
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
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    }

    // Default
    return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
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
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600',
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
  userId,
  recipientEmail,
  onSelectTemplate
}: ScenarioTemplateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isAssignedToOrder, setIsAssignedToOrder] = useState(false);
  const [populatedSubject, setPopulatedSubject] = useState('');
  const [populatedBody, setPopulatedBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showOrderSearch, setShowOrderSearch] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [selectedOrderForTemplate, setSelectedOrderForTemplate] = useState<string>('');
  const [expandedStages, setExpandedStages] = useState<string[]>(['order_status']);
  const [dbTemplates, setDbTemplates] = useState<EmailTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

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
    }
  }, [isOpen]);

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

  const recommendedTemplates = threadCategory
    ? COMBINED_TEMPLATES.filter(t => t.category === threadCategory)
    : [];

  const otherTemplates = threadCategory
    ? COMBINED_TEMPLATES.filter(t => t.category !== threadCategory)
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

  // Load orders when showing order search
  useEffect(() => {
    if (showOrderSearch && userId) {
      loadOrders();
    }
  }, [showOrderSearch, userId]);

  const loadOrders = async () => {
    if (!userId) return;

    setIsLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('shopify_orders')
        .select('id, order_number, shopify_order_id, customer_first_name, customer_last_name, customer_email, total_price, currency, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter out orders without customer information for better UX
      const ordersWithCustomers = (data || []).filter(order =>
        order.customer_first_name || order.customer_last_name || order.customer_email
      );

      setAllOrders(ordersWithCustomers);
      setOrders(ordersWithCustomers);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsAssignedToOrder(false);
    setPopulatedSubject(template.subject);
    setPopulatedBody(template.body);
  };

  const handleShowOrderSearch = () => {
    setShowOrderSearch(true);
  };

  const handleOrderSelection = async (selectedOrderId: string) => {
    setSelectedOrderForTemplate(selectedOrderId);
    setShowOrderSearch(false);
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
      // Use the templateVariableService to fetch all variable data
      const variableData = await fetchVariableData({
        orderId: targetOrderId,
        userId: userId,
        threadId: threadId
      });

      // Replace variables in template using the service
      const subject = replaceVariables(selectedTemplate.subject, variableData);
      const body = replaceVariables(selectedTemplate.body, variableData);

      setPopulatedSubject(subject);
      setPopulatedBody(body);
      setIsAssignedToOrder(true);
    } catch (error) {
      console.error('Error assigning to order:', error);
      toast.error('Failed to load order data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const emailContent = `Subject: ${populatedSubject}\n\n${populatedBody}`;
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
    const parts = text.split(/(\{\{[^}]+\}\})/g);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
                          className="p-4 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md transition-all text-left group focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-0 relative"
                        >
                          {/* Badges positioned top right, stack vertically (hidden on mobile) */}
                          <div className="hidden md:flex absolute top-3 right-3 flex-col items-end gap-1">
                            <TemplateBadges badges={template.badges} />
                          </div>

                          <div className="flex items-start gap-3 md:pr-32">
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
                          <div className="md:hidden mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
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
                    header: 'bg-white dark:bg-gray-800/50',
                    headerHover: 'hover:bg-gray-50 dark:hover:bg-gray-800',
                    icon: 'text-gray-500 dark:text-gray-400',
                    iconBg: 'bg-gray-100 dark:bg-gray-800',
                    text: 'text-gray-900 dark:text-white',
                    badge: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
                    templateHover: 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                  };

                  return (
                    <div key={stage.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
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
                        {isExpanded ? (
                          <ChevronUp className={`w-4 h-4 ${colors.icon} transition-colors`} />
                        ) : (
                          <ChevronDown className={`w-4 h-4 ${colors.icon} transition-colors`} />
                        )}
                      </button>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="px-3 py-3 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700/50 space-y-1.5">
                          {stageTemplates.map((template) => {
                            const Icon = template.icon;
                            return (
                              <button
                                key={template.id}
                                onClick={() => handleSelectTemplate(template)}
                                className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all text-left group focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-0 relative"
                              >
                                {/* Badges positioned top right, stack vertically (hidden on mobile) */}
                                <div className="hidden md:flex absolute top-2.5 right-2.5 flex-col items-end gap-1">
                                  <TemplateBadges badges={template.badges} />
                                </div>

                                <div className="flex items-start gap-3 md:pr-32">
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
                                <div className="md:hidden mt-2 border-t border-gray-100 dark:border-gray-700 pt-2">
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
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                  Subject Line
                </label>
                <div className="text-gray-900 dark:text-white font-medium">
                  {isAssignedToOrder ? populatedSubject : renderTextWithVariables(populatedSubject)}
                </div>
              </div>

              {/* Email Body */}
              <div className="flex-1 p-6 overflow-y-auto">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 block">
                  Email Body
                </label>
                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {isAssignedToOrder ? populatedBody : renderTextWithVariables(populatedBody)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            {/* Order Search Section - Fixed height, only shows when searching */}
            {!isAssignedToOrder && showOrderSearch && (
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 h-[420px] overflow-hidden">
                <div className="space-y-4 h-full flex flex-col">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select an Order
                    </label>
                    <button
                      onClick={() => setShowOrderSearch(false)}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 rounded px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>

                  {isLoadingOrders ? (
                    <div className="flex items-center justify-center flex-1">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : allOrders.length === 0 ? (
                    <div className="flex items-center justify-center flex-1">
                      <div className="text-center">
                        <Package className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No orders found</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search order number..."
                          autoFocus
                          onChange={(e) => {
                            const search = e.target.value.toLowerCase();
                            if (search) {
                              const filtered = allOrders.filter(order =>
                                order.order_number.toLowerCase().includes(search)
                              );
                              setOrders(filtered);
                            } else {
                              setOrders(allOrders);
                            }
                          }}
                          className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-800 dark:text-white text-sm transition-all"
                        />
                      </div>

                      {orders.length === 0 ? (
                        <div className="flex items-center justify-center flex-1">
                          <div className="text-center">
                            <Package className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No matching orders found</p>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-gray-300 dark:border-gray-600 rounded-lg flex-1 overflow-y-auto bg-white dark:bg-gray-800 shadow-sm">
                          {orders.map((order) => (
                            <button
                              key={order.id}
                              onClick={() => handleOrderSelection(order.id)}
                              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all border-b border-gray-200 dark:border-gray-700 last:border-b-0 text-left group focus:outline-none focus:bg-pink-50 dark:focus:bg-pink-900/20"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-pink-100 dark:group-hover:bg-pink-900/20 transition-colors">
                                  <Package className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors" />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-white text-base">
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
                                <p className="text-sm font-bold text-pink-600 dark:text-pink-400">
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
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Action Footer - Always visible with consistent height */}
            <div className="px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  setIsAssignedToOrder(false);
                  setCopied(false);
                  setShowOrderSearch(false);
                }}
                className="h-11 px-5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Templates
              </button>

              <div className="flex items-center gap-4">
                {!isAssignedToOrder && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This template contains variables. Assign to an order to populate with real data.
                  </p>
                )}

                {isAssignedToOrder ? (
                  <button
                    onClick={handleCopyToClipboard}
                    className="group h-11 px-5 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 hover:shadow-md rounded-lg transition-all flex items-center gap-2 shadow-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy to Clipboard
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (orderId) {
                        handleAssignToOrder();
                      } else {
                        handleShowOrderSearch();
                      }
                    }}
                    disabled={isLoading}
                    className="group h-11 px-5 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-2 shadow-sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <span>Populate Template</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
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
