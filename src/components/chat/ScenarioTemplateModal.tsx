import { useState, useEffect } from 'react';
import { X, Copy, Check, Mail, Package, RotateCcw, AlertCircle, Truck, FileCheck, MessageSquare, ThumbsUp, Sparkles, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface ScenarioTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  threadCategory?: string;
  orderId?: string;
  userId: string;
  recipientEmail?: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  subject: string;
  body: string;
  icon: any;
  color: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'replacement_request',
    name: 'Replacement Request',
    category: 'replacement',
    description: 'Approve a replacement request and provide next steps',
    subject: 'Replacement Approved for Order {{order_number}}',
    body: `Hi {{customer_first_name}},

Thank you for reaching out about your order #{{order_number}}.

We're sorry to hear about the issue with your item. We'd be happy to send you a replacement right away!

Your replacement will be shipped from {{factory_name}} via {{logistics_provider}} and should arrive within {{typical_delivery_days}}.

You'll receive a tracking number once your replacement ships.

No need to return the defective item - just dispose of it safely.

If you have any questions, feel free to reply to this email.

Best regards,
{{merchant_store_name}}`,
    icon: RotateCcw,
    color: 'red'
  },
  {
    id: 'tracking_update',
    name: 'Tracking Update',
    category: 'shipping',
    description: 'Provide tracking information for an order',
    subject: 'Your Order #{{order_number}} Has Shipped!',
    body: `Hi {{customer_first_name}},

Great news! Your order #{{order_number}} has been shipped and is on its way to you.

Tracking Details:
• Tracking Number: {{tracking_number}}
• Carrier: {{tracking_company}}
• Track your package: {{tracking_url}}

Your order should arrive within {{typical_delivery_days}}.

Once your package arrives in your country, it will be handed off to your local postal service ({{last_mile_carrier}}) with tracking number: {{last_mile_tracking_number}}

Thank you for your order!

Best regards,
{{merchant_store_name}}`,
    icon: Truck,
    color: 'green'
  },
  {
    id: 'return_approval',
    name: 'Return Approval',
    category: 'return',
    description: 'Approve a return request and provide instructions',
    subject: 'Return Approved for Order {{order_number}}',
    body: `Hi {{customer_first_name}},

We've approved your return request for order #{{order_number}}.

Please ship your return to:
{{return_warehouse_address}}

Once we receive your return, we'll process your refund within 3-5 business days. The refund will be issued to your original payment method.

Return window: {{return_window_days}}

If you have any questions about the return process, please let us know.

Best regards,
{{merchant_store_name}}`,
    icon: Package,
    color: 'orange'
  },
  {
    id: 'defective_product',
    name: 'Defective Product Resolution',
    category: 'defective',
    description: 'Address a defective product complaint',
    subject: 'Resolution for Your Defective Item - Order {{order_number}}',
    body: `Hi {{customer_first_name}},

We sincerely apologize for the defective item you received with order #{{order_number}}.

We'd like to make this right. Please choose your preferred resolution:

Option 1: Full Refund
We can issue a full refund to your original payment method.

Option 2: Replacement
We can send you a replacement item at no additional cost.

Our defect coverage: {{defect_coverage_days}}

Please let us know which option you prefer, and we'll process it immediately.

Again, we apologize for the inconvenience.

Best regards,
{{merchant_store_name}}`,
    icon: AlertCircle,
    color: 'red'
  },
  {
    id: 'order_confirmation',
    name: 'Order Confirmation',
    category: 'confirmation',
    description: 'Confirm order details and set expectations',
    subject: 'Order Confirmed - #{{order_number}}',
    body: `Hi {{customer_first_name}},

Thank you for your order! We've received your order #{{order_number}} and it's being prepared for shipment.

Order Summary:
• Total: {{order_total}}
• Status: {{financial_status}}

Shipping Address:
{{shipping_address_full}}

Your order will be processed within 1-2 business days and shipped via {{logistics_provider}}. Expected delivery: {{typical_delivery_days}}.

You'll receive a tracking number once your order ships.

Thank you for shopping with us!

Best regards,
{{merchant_store_name}}`,
    icon: FileCheck,
    color: 'teal'
  },
  {
    id: 'general_inquiry',
    name: 'General Inquiry Response',
    category: 'inquiry',
    description: 'Response to general customer questions',
    subject: 'Re: Your Question About Order {{order_number}}',
    body: `Hi {{customer_first_name}},

Thank you for reaching out about your order #{{order_number}}.

[Add your personalized response here]

If you have any other questions, please don't hesitate to ask. We're here to help!

Best regards,
{{merchant_store_name}}`,
    icon: MessageSquare,
    color: 'gray'
  },
  {
    id: 'thank_you',
    name: 'Thank You Message',
    category: 'thankyou',
    description: 'Express gratitude for their business',
    subject: 'Thank You for Your Order!',
    body: `Hi {{customer_first_name}},

We wanted to take a moment to thank you for your recent order #{{order_number}}!

Your support means the world to us. We hope you love your purchase!

If you have any feedback or questions, we'd love to hear from you.

Thank you for being an amazing customer!

Best regards,
{{merchant_store_name}}`,
    icon: ThumbsUp,
    color: 'pink'
  }
];

const CATEGORY_LABELS: Record<string, string> = {
  replacement: 'Replacement',
  damaged: 'Damaged',
  return: 'Returns',
  defective: 'Defective',
  shipping: 'Shipping',
  confirmation: 'Confirmation',
  quote_followup: 'Quote Follow-up',
  inquiry: 'Inquiry',
  thankyou: 'Thank You'
};

export function ScenarioTemplateModal({
  isOpen,
  onClose,
  threadId,
  threadCategory,
  orderId,
  userId,
  recipientEmail
}: ScenarioTemplateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isAssignedToOrder, setIsAssignedToOrder] = useState(false);
  const [populatedSubject, setPopulatedSubject] = useState('');
  const [populatedBody, setPopulatedBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const filteredTemplates = threadCategory
    ? TEMPLATES.filter(t => t.category === threadCategory)
    : TEMPLATES;

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsAssignedToOrder(false);
    setPopulatedSubject(template.subject);
    setPopulatedBody(template.body);
  };

  const handleAssignToOrder = async () => {
    if (!selectedTemplate || !orderId) {
      toast.error('No order selected');
      return;
    }

    setIsLoading(true);
    try {
      // Fetch order data
      const { data: order, error: orderError } = await supabase
        .from('shopify_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch merchant store name
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company')
        .eq('user_id', userId)
        .single();

      // Fetch tracking data if available
      const { data: tracking } = await supabase
        .from('shopify_order_fulfillments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Build variables object
      const variables: Record<string, string> = {
        customer_first_name: order.customer_first_name || 'there',
        customer_last_name: order.customer_last_name || '',
        customer_email: order.customer_email || '',
        order_number: order.order_number || '',
        order_total: `$${order.total_price?.toFixed(2) || '0.00'}`,
        financial_status: order.financial_status || 'pending',
        fulfillment_status: order.fulfillment_status || 'unfulfilled',
        shipping_address_line1: order.shipping_address_line1 || '',
        shipping_address_line2: order.shipping_address_line2 || '',
        shipping_city: order.shipping_city || '',
        shipping_state: order.shipping_state || '',
        shipping_zip: order.shipping_zip || '',
        shipping_country: order.shipping_country || '',
        shipping_address_full: [
          order.shipping_address_line1,
          order.shipping_address_line2,
          `${order.shipping_city}, ${order.shipping_state} ${order.shipping_zip}`,
          order.shipping_country,
        ].filter(Boolean).join('\n'),
        tracking_number: tracking?.tracking_number || '[TRACKING PENDING]',
        tracking_company: tracking?.tracking_company || 'YunExpress',
        tracking_url: tracking?.tracking_url || '[TRACKING URL PENDING]',
        last_mile_tracking_number: tracking?.last_mile_tracking_number || '[LOCAL TRACKING PENDING]',
        last_mile_carrier: tracking?.last_mile_carrier || 'USPS/Canada Post/Australia Post',
        merchant_store_name: profile?.company || 'Our Store',
        factory_name: 'Our Factory',
        logistics_provider: 'YunExpress',
        typical_delivery_days: '7-14 business days',
        return_warehouse_address: '[RETURN ADDRESS]',
        defect_coverage_days: '30 days',
        return_window_days: '30 days',
        replacement_ship_time_days: '3-5 business days',
      };

      // Replace variables in template
      let subject = selectedTemplate.subject;
      let body = selectedTemplate.body;

      Object.keys(variables).forEach((key) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        subject = subject.replace(regex, variables[key]);
        body = body.replace(regex, variables[key]);
      });

      setPopulatedSubject(subject);
      setPopulatedBody(body);
      setIsAssignedToOrder(true);
      toast.success('Template populated with order data!');
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-500 dark:hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all text-left group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 p-2.5 rounded-lg bg-${template.color}-100 dark:bg-${template.color}-900/30`}>
                          <Icon className={`w-5 h-5 text-${template.color}-600 dark:text-${template.color}-400`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {template.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {template.description}
                          </p>
                          <div className="mt-2">
                            <span className={`inline-block px-2 py-0.5 text-xs rounded-full bg-${template.color}-100 dark:bg-${template.color}-900/30 text-${template.color}-700 dark:text-${template.color}-300`}>
                              {CATEGORY_LABELS[template.category] || template.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Assign to Order Button */}
              {!isAssignedToOrder && orderId && (
                <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        This template contains variables. Click to populate with order data.
                      </p>
                    </div>
                    <button
                      onClick={handleAssignToOrder}
                      disabled={isLoading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      {isLoading ? 'Loading...' : 'Assign to Order'}
                    </button>
                  </div>
                </div>
              )}

              {isAssignedToOrder && (
                <div className="px-6 py-3 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-green-900 dark:text-green-100">
                      Template populated with order data
                    </p>
                  </div>
                </div>
              )}

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
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
            <button
              onClick={() => {
                setSelectedTemplate(null);
                setIsAssignedToOrder(false);
                setCopied(false);
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              ← Back to Templates
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-lg transition-colors flex items-center gap-2"
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
          </div>
        )}
      </div>
    </div>
  );
}
