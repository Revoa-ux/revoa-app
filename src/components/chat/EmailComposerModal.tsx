import React, { useState, useEffect } from 'react';
import { X, Mail, Copy, ExternalLink, Loader2, Check, Sparkles, AlertCircle } from 'lucide-react';
import Modal from '@/components/Modal';
import { toast } from '../../lib/toast';
import { supabase } from '@/lib/supabase';

interface EmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  orderId?: string;
  customerEmail: string;
  customerName: string;
  threadTags: string[];
}

interface Template {
  id: string;
  template_name: string;
  template_category: string;
  subject_line: string;
  body_text: string;
  thread_tags: string[];
  product_id: string;
  product_name: string;
}

interface Product {
  id: string;
  name: string;
}

interface OrderData {
  order_number: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  total_price: number;
  financial_status: string;
  fulfillment_status: string;
  created_at: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
}

interface ProductConfig {
  factory_name: string;
  logistics_provider: string;
  return_warehouse_address: string;
  defect_coverage_days: string;
  return_window_days: string;
  replacement_ship_time_days: string;
  damage_claim_deadline_days: string;
  typical_delivery_days: string;
}

export function EmailComposerModal({
  isOpen,
  onClose,
  threadId,
  orderId,
  customerEmail,
  customerName,
  threadTags,
}: EmailComposerModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [productConfig, setProductConfig] = useState<ProductConfig | null>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [populatedSubject, setPopulatedSubject] = useState('');
  const [populatedBody, setPopulatedBody] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [merchantStoreName, setMerchantStoreName] = useState('Your Store');

  useEffect(() => {
    if (isOpen && orderId) {
      fetchData();
    }
  }, [isOpen, orderId]);

  useEffect(() => {
    if (selectedTemplate && orderData && productConfig) {
      populateTemplate();
    }
  }, [selectedTemplate, orderData, productConfig, trackingData]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch order data
      if (orderId) {
        const { data: order, error: orderError } = await supabase
          .from('shopify_orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (orderError) throw orderError;
        setOrderData(order);

        // Fetch merchant store name
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company')
          .eq('user_id', order.user_id)
          .single();

        if (profile?.company) {
          setMerchantStoreName(profile.company);
        }

        // Fetch tracking data
        const { data: fulfillments } = await supabase
          .from('shopify_order_fulfillments')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fulfillments && fulfillments.length > 0) {
          setTrackingData(fulfillments[0]);
        }

        // Fetch products from order (we'll need to get this from order line items or product associations)
        // For now, fetch all products for this user
        const { data: userProducts, error: productsError } = await supabase
          .from('products')
          .select('id, name')
          .eq('user_id', order.user_id)
          .eq('status', 'approved');

        if (productsError) throw productsError;
        setProducts(userProducts || []);

        // If only one product, auto-select it
        if (userProducts && userProducts.length === 1) {
          setSelectedProduct(userProducts[0].id);
          await fetchTemplatesAndConfig(userProducts[0].id, order.user_id);
        } else if (userProducts && userProducts.length > 1) {
          // Fetch templates for all products
          const { data: allTemplates } = await supabase
            .from('email_response_templates')
            .select('*, products(name)')
            .eq('user_id', order.user_id)
            .eq('is_active', true);

          if (allTemplates) {
            const templatesWithProduct = allTemplates.map((t: any) => ({
              ...t,
              product_name: t.products?.name || 'Unknown Product',
            }));
            setTemplates(templatesWithProduct);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load email data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplatesAndConfig = async (productId: string, userId: string) => {
    try {
      // Fetch templates for selected product
      const { data: productTemplates, error: templatesError } = await supabase
        .from('email_response_templates')
        .select('*, products(name)')
        .eq('product_id', productId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (templatesError) throw templatesError;

      const templatesWithProduct = (productTemplates || []).map((t: any) => ({
        ...t,
        product_name: t.products?.name || 'Unknown Product',
      }));

      setTemplates(templatesWithProduct);

      // Fetch product configuration
      const { data: factory } = await supabase
        .from('product_factory_configs')
        .select('*')
        .eq('product_id', productId)
        .single();

      const { data: logistics } = await supabase
        .from('product_logistics_configs')
        .select('*')
        .eq('product_id', productId)
        .single();

      const { data: variables } = await supabase
        .from('product_policy_variables')
        .select('*')
        .eq('product_id', productId);

      // Build config object
      const config: any = {
        factory_name: factory?.factory_name || 'Our Factory',
        logistics_provider: logistics?.provider_name || 'YunExpress',
        typical_delivery_days: logistics?.typical_delivery_days || '7-14 days',
      };

      // Add policy variables
      (variables || []).forEach((v: any) => {
        config[v.variable_key] = v.variable_value;
      });

      setProductConfig(config);
    } catch (error) {
      console.error('Error fetching product config:', error);
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    if (orderData) {
      fetchTemplatesAndConfig(productId, orderData.user_id);
    }
  };

  const getSuggestedTemplates = () => {
    if (templates.length === 0) return [];

    // Score templates based on thread tags
    const scored = templates.map((template) => {
      let score = 0;
      threadTags.forEach((tag) => {
        if (template.thread_tags.includes(tag)) {
          score += 10;
        }
      });

      // Boost templates matching order status
      if (orderData?.fulfillment_status === 'unfulfilled' && template.template_category === 'order_status') {
        score += 5;
      }
      if (orderData?.fulfillment_status === 'fulfilled' && template.template_name.includes('Tracking')) {
        score += 5;
      }

      return { template, score };
    });

    return scored.sort((a, b) => b.score - a.score);
  };

  const populateTemplate = () => {
    if (!selectedTemplate || !orderData) return;

    const variables: Record<string, string> = {
      // Customer data
      customer_first_name: orderData.customer_first_name || customerName.split(' ')[0] || 'there',
      customer_last_name: orderData.customer_last_name || '',
      customer_email: orderData.customer_email || customerEmail,
      customer_phone: orderData.customer_phone || '',

      // Order data
      order_number: orderData.order_number || '',
      order_total: `$${orderData.total_price?.toFixed(2) || '0.00'}`,
      financial_status: orderData.financial_status || 'pending',
      fulfillment_status: orderData.fulfillment_status || 'unfulfilled',

      // Shipping address
      shipping_address_line1: orderData.shipping_address_line1 || '',
      shipping_address_line2: orderData.shipping_address_line2 || '',
      shipping_city: orderData.shipping_city || '',
      shipping_state: orderData.shipping_state || '',
      shipping_zip: orderData.shipping_zip || '',
      shipping_country: orderData.shipping_country || '',
      shipping_address_full: [
        orderData.shipping_address_line1,
        orderData.shipping_address_line2,
        `${orderData.shipping_city}, ${orderData.shipping_state} ${orderData.shipping_zip}`,
        orderData.shipping_country,
      ].filter(Boolean).join('\n'),

      // Tracking data
      tracking_number: trackingData?.tracking_number || '[TRACKING PENDING]',
      tracking_company: trackingData?.tracking_company || '',
      tracking_url: trackingData?.tracking_url || '',
      last_mile_tracking_number: trackingData?.last_mile_tracking_number || '[LAST MILE TRACKING PENDING]',
      last_mile_carrier: trackingData?.last_mile_carrier || 'USPS/Australia Post/Canada Post',

      // Merchant data
      merchant_store_name: merchantStoreName,

      // Product config
      ...(productConfig || {}),
    };

    // Populate subject
    let subject = selectedTemplate.subject_line;
    let body = selectedTemplate.body_text;

    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, variables[key] || `[${key.toUpperCase()}]`);
      body = body.replace(regex, variables[key] || `[${key.toUpperCase()}]`);
    });

    setPopulatedSubject(subject);
    setPopulatedBody(body);
  };

  const handleCopyToClipboard = async () => {
    const fullEmail = `Subject: ${populatedSubject}\n\nTo: ${customerEmail}\n\n${populatedBody}`;
    await navigator.clipboard.writeText(fullEmail);
    setIsCopied(true);
    toast.success('Email copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);

    // Log usage
    if (selectedTemplate) {
      await supabase.from('template_usage_log').insert({
        user_id: orderData?.user_id,
        template_id: selectedTemplate.id,
        thread_id: threadId,
        order_id: orderId,
        product_id: selectedProduct,
        action_taken: 'copied',
      });

      // Increment usage count
      await supabase.rpc('increment', {
        table_name: 'email_response_templates',
        row_id: selectedTemplate.id,
        column_name: 'usage_count',
      });
    }
  };

  const handleOpenInEmail = () => {
    const mailtoLink = `mailto:${customerEmail}?subject=${encodeURIComponent(populatedSubject)}&body=${encodeURIComponent(populatedBody)}`;
    window.location.href = mailtoLink;

    // Log usage
    if (selectedTemplate && orderData) {
      supabase.from('template_usage_log').insert({
        user_id: orderData.user_id,
        template_id: selectedTemplate.id,
        thread_id: threadId,
        order_id: orderId,
        product_id: selectedProduct,
        action_taken: 'opened_email',
      });
    }
  };

  const suggestedTemplates = getSuggestedTemplates();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-[#333333] pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-6 h-6 text-rose-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Draft Email Response
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            To: {customerEmail}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar - Template Selector */}
            <div className="col-span-4 space-y-4">
              {/* Product Selector */}
              {products.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Product
                  </label>
                  <select
                    value={selectedProduct || ''}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-dark dark:text-white text-sm"
                  >
                    <option value="">Choose a product...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Suggested Templates */}
              {selectedProduct && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Suggested Templates
                    </h3>
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {suggestedTemplates.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No templates found</p>
                        <p className="text-xs mt-1">Templates need to be configured first</p>
                      </div>
                    ) : (
                      suggestedTemplates.map(({ template, score }) => (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template)}
                          className={`w-full p-3 text-left rounded-lg border transition-colors ${
                            selectedTemplate?.id === template.id
                              ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                              : 'border-gray-200 dark:border-[#333333] hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              {template.template_name}
                            </h4>
                            {score > 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded">
                                Match
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {template.thread_tags.join(', ')}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Main Content - Email Preview */}
            <div className="col-span-8">
              {!selectedProduct ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Select a product to see available templates</p>
                </div>
              ) : !selectedTemplate ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Select a template to preview</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Subject Line */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                      Subject
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-dark border border-gray-200 dark:border-[#333333] rounded-lg">
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {populatedSubject}
                      </p>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                      Email Body
                    </label>
                    <div className="p-4 bg-white dark:bg-dark border border-gray-200 dark:border-[#333333] rounded-lg min-h-[400px]">
                      <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                        {populatedBody}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-4">
                    <button
                      onClick={handleCopyToClipboard}
                      className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
                    >
                      {isCopied ? (
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
                    <button
                      onClick={handleOpenInEmail}
                      className="btn btn-danger flex-1 flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4 btn-icon" />
                      Open in Email Client
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
