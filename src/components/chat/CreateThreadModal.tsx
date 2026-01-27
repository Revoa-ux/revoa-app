import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle, Loader2, Tag as TagIcon, ArrowLeft, ArrowRight, RefreshCw, Filter } from 'lucide-react';
import { toast } from '../../lib/toast';
import Modal from '@/components/Modal';
import { supabase } from '@/lib/supabase';
import { flowTriggerService } from '@/lib/flowTriggerService';
import { manualSync } from '@/lib/shopifyAutoSync';

interface Order {
  id: string;
  shopify_order_id: string;
  order_number: string;
  total_price: string;
  ordered_at: string;
  currency: string;
  customer_first_name?: string;
  customer_last_name?: string;
  customer_email?: string;
}

interface CreateThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  userId: string;
  onThreadCreated: (threadId: string) => void;
  initialOrderId?: string;
}

const TAG_OPTIONS: Array<{ value: string; label: string; color: string }> = [
  { value: 'cancel_modify', label: 'Cancel/Modify Order', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600' },
  { value: 'damaged', label: 'Damaged Item', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600' },
  { value: 'defective', label: 'Defective Product', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-600' },
  { value: 'wrong_item', label: 'Wrong Item Received', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-600' },
  { value: 'missing_items', label: 'Missing Items', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600' },
  { value: 'shipping', label: 'Shipping/Delivery', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600' },
  { value: 'return', label: 'Return Request', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600' },
  { value: 'refund', label: 'Refund Request', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600' },
  { value: 'replacement', label: 'Replacement', color: 'bg-slate-100 dark:bg-[#2a2a2a] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#4a4a4a]' },
];

export function CreateThreadModal({
  isOpen,
  onClose,
  chatId,
  userId,
  onThreadCreated,
  initialOrderId,
}: CreateThreadModalProps) {
  const [description, setDescription] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isOpen && !userId) {
      setOrders([]);
      setSearchQuery('');
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (isOpen && initialOrderId && userId) {
      loadInitialOrder();
    }
  }, [isOpen, initialOrderId, userId]);

  const loadInitialOrder = async () => {
    if (!initialOrderId || !userId) return;

    setIsLoadingOrders(true);
    try {
      const { data: orderData, error } = await supabase
        .from('shopify_orders')
        .select('id, shopify_order_id, order_number, total_price, ordered_at, currency, customer_first_name, customer_last_name, customer_email')
        .eq('shopify_order_id', initialOrderId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (orderData) {
        setSelectedOrder(orderData);
        setSelectedOrderId(orderData.id);
        setOrders([orderData]);
        setSearchQuery(orderData.order_number.replace('#', ''));
      }
    } catch (error) {
      console.error('Error loading initial order:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const searchOrders = async (query: string) => {
    if (!userId || !query.trim()) {
      setOrders([]);
      return;
    }

    setIsLoadingOrders(true);
    try {
      // Clean up the query - remove # if user included it
      const cleanQuery = query.replace(/^#/, '').trim();

      // Search with multiple patterns to be more flexible
      // Try exact match on order_number, or partial match
      const { data: orderResults, error } = await supabase
        .from('shopify_orders')
        .select('id, shopify_order_id, order_number, total_price, ordered_at, currency, customer_first_name, customer_last_name, customer_email, fulfillment_status')
        .eq('user_id', userId)
        .or(`order_number.ilike.%${cleanQuery}%,order_number.ilike.#${cleanQuery}%,shopify_order_id.ilike.%${cleanQuery}%`)
        .order('ordered_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[CreateThreadModal] Search error:', error);
        throw error;
      }

      console.log('[CreateThreadModal] Search results for', cleanQuery, ':', orderResults?.length || 0, 'orders found');

      // Apply smart filtering based on tag, but keep it as suggestions rather than strict filtering
      // This allows users to still find orders even if status isn't perfectly updated
      let filteredResults = orderResults || [];

      if (selectedTag && filteredResults.length > 0) {
        switch (selectedTag) {
          case 'cancel_modify':
          case 'cancel':
          case 'modify':
            // Prefer unfulfilled orders but show all if none match
            const unfulfilled = filteredResults.filter(o => !o.fulfillment_status || o.fulfillment_status !== 'fulfilled');
            if (unfulfilled.length > 0) {
              filteredResults = unfulfilled;
            }
            break;

          case 'wrong_item':
            // Prefer fulfilled orders but show all if none match
            const fulfilled = filteredResults.filter(o => o.fulfillment_status === 'fulfilled');
            if (fulfilled.length > 0) {
              filteredResults = fulfilled;
            }
            break;

          case 'damaged':
          case 'defective':
          case 'return':
          case 'missing_items':
            // For delivery-related issues, try to get delivered orders but don't block if none found
            const orderIds = filteredResults.map(o => o.id);

            const { data: fulfillments } = await supabase
              .from('shopify_order_fulfillments')
              .select('order_id, shipment_status')
              .in('order_id', orderIds);

            const deliveredOrderIds = new Set(
              fulfillments?.filter(f => f.shipment_status === 'delivered').map(f => f.order_id) || []
            );
            const fulfilledOrderIds = new Set(
              fulfillments?.map(f => f.order_id) || []
            );

            // Prefer delivered > fulfilled > any
            const deliveredOrders = filteredResults.filter(o => deliveredOrderIds.has(o.id));
            const fulfilledOrders = filteredResults.filter(o => fulfilledOrderIds.has(o.id) || o.fulfillment_status === 'fulfilled');

            if (deliveredOrders.length > 0) {
              filteredResults = deliveredOrders;
            } else if (fulfilledOrders.length > 0) {
              filteredResults = fulfilledOrders;
            }
            // Otherwise keep all results
            break;
        }
      }

      setOrders(filteredResults.slice(0, 10));
    } catch (error) {
      console.error('Error searching orders:', error);
      toast.error('Failed to search orders');
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchOrders(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, userId, selectedTag]);

  const handleCreate = async () => {
    // Check for valid chatId first
    if (!chatId) {
      toast.error('Chat is loading. Please wait a moment and try again.');
      return;
    }

    if (!userId) {
      toast.error('Please log in to create a thread.');
      return;
    }

    if (!selectedTag) {
      toast.error('Please select an issue category');
      return;
    }

    if (!selectedOrderId) {
      toast.error('Please select an order for this thread');
      return;
    }

    // Auto-generate title from order number
    const title = selectedOrder?.order_number || `Order ${selectedOrderId.slice(0, 8)}`;

    setIsCreating(true);
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;

      const { data: threadData, error } = await supabase
        .from('chat_threads')
        .insert({
          chat_id: chatId,
          order_id: selectedOrderId,
          shopify_order_id: selectedOrder?.shopify_order_id,
          title: title,
          description: description.trim() || null,
          tag: selectedTag || null,
          created_by_user_id: currentUser?.id,
          created_by_admin: false, // User is creating this
          status: 'open',
        })
        .select('id, tag')
        .single();

      if (error) throw error;

      // Try to auto-start a conversational flow for this thread
      const flowStarted = await flowTriggerService.autoStartFlowIfNeeded(
        threadData.id,
        title,
        threadData.tag || undefined
      );

      // Only send welcome message if no flow was started
      if (!flowStarted) {
        const welcomeMessage = getThreadWelcomeMessage(threadData.tag, selectedOrder);

        if (welcomeMessage) {
          const { error: messageError } = await supabase.from('messages').insert({
            chat_id: chatId,
            thread_id: threadData.id,
            content: welcomeMessage,
            type: 'text',
            sender: 'team',
            timestamp: new Date().toISOString(),
            metadata: {
              automated: true,
              thread_welcome: true,
              thread_tag: threadData.tag
            }
          });

          if (messageError) {
            console.error('Error creating welcome message:', messageError);
          }
        }
      }

      onThreadCreated(threadData.id);
      handleClose();
    } catch (error) {
      console.error('Error creating thread:', error);
      toast.error('Failed to create thread');
    } finally {
      setIsCreating(false);
    }
  };

  const getThreadWelcomeMessage = (tag: string | null, order: Order | undefined): string => {
    const orderNum = order?.order_number || 'the order';

    switch (tag) {
      case 'cancel_modify':
      case 'cancel':
      case 'modify':
        return `Your customer wants to cancel or modify order ${orderNum}. Let me help you understand what's possible.

**What to Check First:**
• Look at the Order Status in the sidebar → Is it shipped yet?
• Check fulfillment status to see if changes are still possible

**If NOT Shipped:**
✓ Full cancellation available - Process refund after canceling
✓ Address changes usually possible - Contact {{logistics_provider}}
✓ Item modifications may be possible - Check with warehouse

**If Already Shipped:**
✗ Cancellation not possible - Must process as a return
✗ Address changes limited - Depends on carrier and location

**What to Ask Your Customer:**
1. What specific changes do they want?
2. Is it urgent? (helps prioritize with fulfillment team)

**Templates to Use:**
• **[Cancel Order - Not Shipped]** - For pre-fulfillment cancellations
• **[Order Modification - Address]** - For address changes
• **[Return After Shipment]** - If already shipped

**Policy Reminder:** Customer-requested changes are fee-free if order hasn't shipped yet.`;

      case 'wrong_item':
        return `The customer received the wrong item for ${orderNum}. This is a fulfillment error that you'll need to make right.

**What to Gather from Customer:**
• Photos of the item they received (show label/packaging)
• What item they ordered vs. what they got
• Order confirmation screenshot (optional but helpful)

**How to Resolve:**
1. Verify the error by checking their order in Shopify
2. Ship the correct item immediately (expedited if possible)
3. Provide prepaid return label for wrong item

**Templates to Use:**
• **[Wrong Item - Gathering Info]** - Ask for photos first
• **[Wrong Item - Resolution]** - After you verify and ship correct item

**Warehouse Note:** If this is a pattern, reach out to your fulfillment team to investigate the root cause.

**Your Customer's Experience:** They should get the correct item ASAP without any hassle or additional cost. This was your mistake, so make it easy for them.`;

      case 'missing_items':
        return `Items are missing from ${orderNum}. Let's gather the facts and make this right.

**What to Ask Your Customer:**
• What items were supposed to be in the package?
• What items did they actually receive?
• Photos of everything they got (including packaging)

**How to Verify:**
1. Pull up the order in Shopify - check what was supposed to ship
2. Check the packing list/slip if customer has it
3. Review photos to confirm what's missing

**Resolution Steps:**
1. Ship missing items immediately at no charge to customer
2. Use expedited shipping if it was a significant portion of order
3. Consider a goodwill gesture (discount code) for the inconvenience

**Templates to Use:**
• **[Missing Items - Gathering Info]** - Initial response
• **[Missing Items - Shipping Replacement]** - After you confirm and ship

**Warehouse Follow-Up:** Report this to your fulfillment team to prevent future issues.`;

      case 'damaged':
        return `The customer received damaged items from ${orderNum}. Let me help you figure out who covers this and how to resolve it.

**Step 1: Gather Documentation**
Ask customer for:
• Photos of the damage (product AND outer packaging)
• Photos of shipping labels
• Description of the damage

**Step 2: Determine Who's Responsible**
Check the sidebar → **Tracking Company:** {{tracking_company}}

**If Last-Mile Carrier (USPS, Canada Post, Australia Post):**
⚠️ Customer must file claim directly with carrier using their last-mile tracking number. You cannot file on their behalf.

**If Your Logistics Provider ({{logistics_provider}}):**
→ Check product config: Does {{logistics_provider}} cover damaged items?
• **If YES:** You can file claim and send replacement to customer
• **If NO:** Customer needs to file with {{logistics_provider}} directly

**Templates to Use:**
• **[Damage - Customer Claim Required]** - For last-mile carrier issues
• **[Damage - Provider Covered]** - If logistics partner covers it
• **[Damage - Replacement Process]** - After determining coverage

**Timeline Note:** Carrier claims can take {{typical_claim_time}} to process. Set customer expectations.`;

      case 'defective':
        return `Defect claim for ${orderNum}. Let's check coverage and coordinate with the factory.

**Check Coverage Period:**
Product defect coverage: **{{product_defect_coverage_days}} days** from delivery
Order delivered: **{{days_since_delivery}} days ago**

**Status:** [Coverage Active / Coverage Expired]

**What to Ask Customer:**
• What's defective? (be specific - doesn't turn on, broke after X uses, etc.)
• Photos or video showing the defect
• When did they first notice the issue?

**Next Steps:**
1. Review their documentation
2. Contact factory for assessment: **{{product_factory_name}}**
   - Email: {{factory_contact_email}}
   - Include: Photos, order date, customer description
3. Wait for factory decision (usually {{factory_response_time}})

**Possible Resolutions:**
• Replacement shipped by factory
• Full refund (if not fixable)
• Repair instructions (if applicable)
• Partial refund for minor defects

**Templates to Use:**
• **[Defect - Gathering Info]** - Initial response to customer
• **[Defect - Factory Reviewing]** - While waiting on factory
• **[Defect - Replacement Approved]** - After factory approves
• **[Defect - Refund Approved]** - If refund instead

**Important:** If coverage expired, customer may still be entitled to statutory warranty depending on location.`;

      case 'shipping':
        return `Shipping/delivery inquiry for ${orderNum}. Let's see what the customer needs.

**Common Issues You Can Help With:**
• Tracking not updating → Check carrier website directly
• Delivery estimate → Typical time is {{typical_delivery_days}}
• Package appears stuck → May need carrier intervention
• Delivery attempted but missed → Arrange redelivery
• Package lost → File claim after {{lost_package_days}} days

**What to Check:**
→ **Fulfillment Status:** {{fulfillment_status}}
→ **Tracking Number:** {{tracking_number}}
→ **Last Update:** {{last_tracking_update}}

**What to Ask Customer:**
• What specifically are they concerned about?
• Have they checked the tracking link?
• Is there a delivery deadline they're worried about?

**Templates to Use:**
• **[Shipping - Status Update]** - General tracking info
• **[Shipping - Delayed Package]** - If stuck or late
• **[Shipping - Lost Package]** - For filing claims
• **[Shipping - Delivery Issues]** - For missed deliveries

**Pro Tip:** Check the carrier's website yourself before responding. Sometimes tracking is more detailed there than what you see in Shopify.`;

      case 'return':
        return `Return request initiated for ${orderNum}. Here's the workflow to follow.

**Step 1: Understand WHY They Want to Return**
Ask customer: "What's the reason for the return?"

**This determines fees:**
• Changed mind / didn't like it = **Customer pays return shipping**
• Defective / damaged / wrong item = **You cover return shipping**
• Your fault (quality, listing mismatch) = **You cover return + possible refund of original shipping**

**Step 2: Generate Warehouse Entry Number (WEN)**
You'll need to create a WEN for tracking. This is critical - without it, the warehouse may reject the return.

Format: WEN-{{order_number}}-{{date}}
Example: WEN-1022-120625

**Step 3: Provide Return Instructions**
Use template: **[Return Instructions with WEN]**

This template will auto-fill:
• Your warehouse return address: {{warehouse_return_address}}
• The WEN they need to write on the package
• What to include inside the package

**Step 4: Important Reminders for Customer**
⚠️ Write WEN clearly on OUTSIDE of package
⚠️ Include note inside with: Name, order #, product names, quantity
⚠️ Returns without WEN or proper labeling may be rejected

**Step 5: Track the Return**
Once customer ships, add tracking number to this thread so you can monitor it.

**Refund Timing:** Only process refund AFTER warehouse confirms receipt and inspection.`;

      case 'refund':
        return `Refund request for ${orderNum}. Let's determine what's appropriate here.

**First, Understand the Situation:**
Ask customer:
• Why are they requesting a refund?
• Did they receive the item(s)?
• What condition is the item in?

**Refund Scenarios:**

**1. Item Not Received / Lost in Transit:**
→ Verify tracking shows non-delivery
→ Full refund appropriate after {{lost_package_days}} days

**2. Customer Wants Return:**
→ Must follow return process first (see Return category)
→ Refund only AFTER warehouse receives and inspects
→ May deduct return shipping if customer's choice

**3. Defective / Wrong Item:**
→ Full refund including original shipping
→ May not require return (your call)

**4. Partial Refund:**
→ For minor issues customer is willing to keep item for
→ Negotiate reasonable amount

**What to Check:**
• Order status in Shopify
• Product condition from customer photos
• Your return/refund policy for this product
• Who's at fault (you vs. customer preference)

**Templates to Use:**
• **[Refund - Item Not Received]** - For lost packages
• **[Refund - After Return]** - Once return processed
• **[Refund - Partial Offer]** - For keep-with-discount scenarios

**Policy Reminder:** Only process refunds after verifying the reason is valid per your terms.`;

      case 'replacement':
        return `Replacement request for ${orderNum}. Let's figure out the best way to handle this.

**First, Understand What Happened:**
• Is item defective?
• Was item damaged in shipping?
• Did customer receive wrong item?
• Did customer order wrong thing?

**Replacement Options:**

**1. Free Replacement (Your Responsibility):**
When: Defective, damaged, wrong item, quality issue
Process: Ship replacement immediately, handle return separately

**2. Paid Replacement (Customer Error):**
When: Customer ordered wrong size/color/variant
Process: They can place new order, return original for refund

**3. Exchange:**
When: Customer wants different variant of same product
Process: Ship new variant, arrange return of original

**What to Ask Customer:**
• What exactly do they want to replace?
• Why do they need a replacement?
• What variant/size do they want instead?
• Photos (if quality issue)

**Next Steps:**
1. Determine if it's a free replacement or customer pays
2. Check inventory for replacement item
3. Ship replacement (with tracking)
4. Handle return of original if needed

**Templates to Use:**
• **[Replacement - Free]** - For defects/errors
• **[Replacement - Exchange]** - For variant swaps
• **[Replacement - Customer Error]** - When they ordered wrong thing

**Factory Coordination:** If defect, contact {{product_factory_name}} to report and possibly claim.`;

      default:
        return `New thread created for ${orderNum}. Here's how to handle general inquiries.

**Start By Understanding What They Need:**
Common inquiry types:
• Order status / tracking information
• Product questions or specifications
• Delivery timeline concerns
• General customer service

**Information to Have Ready:**
Check the Customer Sidebar for:
• Order status and fulfillment details
• Tracking information
• Customer's full order history
• Any previous communications

**Best Practices:**
1. Ask clarifying questions to understand the specific need
2. Reference order details to show you're informed
3. Be proactive - anticipate follow-up questions
4. Use templates for common scenarios

**Template Library:**
Browse the scenario templates to find relevant responses for:
• Order updates
• Product information
• Shipping questions
• General customer service

**Tip:** The faster you can identify what they actually need, the faster you can resolve it. Don't be afraid to ask direct questions.`;
    }
  };

  const handleClose = () => {
    setDescription('');
    setSelectedOrderId('');
    setSelectedOrder(null);
    setSelectedTag('');
    setSearchQuery('');
    setOrders([]);
    onClose();
  };

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleRefresh = async () => {
    if (!userId) {
      toast.error('Please log in to refresh orders');
      return;
    }

    setIsRefreshing(true);
    try {
      const result = await manualSync(userId);
      if (result.success) {
        toast.success('Orders refreshed successfully');
        // Re-run the search if there's a query
        if (searchQuery) {
          await searchOrders(searchQuery);
        }
      } else {
        toast.error(result.error || 'Failed to refresh orders');
      }
    } catch (error) {
      console.error('Error refreshing orders:', error);
      toast.error('Failed to refresh orders');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Issue Thread">
      <div className="pb-20 h-[60vh] overflow-y-auto">
        {/* Info Banner */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900 dark:text-red-100">
              <p className="font-medium mb-1">Order-Specific Issue Tracking</p>
              <p className="text-red-700 dark:text-red-300">
                Create a dedicated thread to track defective items, shipping issues, or other order-specific problems. Keep conversations organized and easy to reference.
              </p>
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <TagIcon className="w-4 h-4 inline mr-1" />
            Issue Category *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TAG_OPTIONS.map(tag => (
              <button
                key={tag.value}
                type="button"
                onClick={() => setSelectedTag(selectedTag === tag.value ? '' : tag.value)}
                className={`px-5 py-3.5 rounded-lg text-xs font-normal transition-all border flex items-center justify-center text-center ${
                  selectedTag === tag.value
                    ? tag.color + ' shadow-sm'
                    : 'bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 text-gray-700 dark:text-gray-300 hover:shadow-md border-gray-200/60 dark:border-[#333333]/60'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Order Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Related Order *
            </label>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg border border-gray-300 dark:border-[#4a4a4a] bg-white dark:bg-dark hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh order status"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-600 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search Input with absolute dropdown and filter notice */}
          <div className="mb-3 relative">
            <input
              type="text"
              placeholder="Search order number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-pink-500 dark:bg-dark dark:text-white text-sm"
            />

            {/* Smart Filter Notice - Absolutely positioned above search */}
            {selectedTag && (
              <div className="absolute bottom-full left-0 right-0 mb-1 p-2 bg-gray-50 dark:bg-dark border border-gray-200 dark:border-[#333333] rounded-lg z-40">
                <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {selectedTag === 'damaged' || selectedTag === 'defective' || selectedTag === 'return' || selectedTag === 'missing_items'
                      ? `Showing only delivered orders for ${TAG_OPTIONS.find(t => t.value === selectedTag)?.label || 'issue'}`
                      : selectedTag === 'cancel_modify' || selectedTag === 'cancel' || selectedTag === 'modify'
                      ? `Showing only unfulfilled orders for ${TAG_OPTIONS.find(t => t.value === selectedTag)?.label || 'issue'}`
                      : selectedTag === 'wrong_item'
                      ? `Showing only fulfilled orders for ${TAG_OPTIONS.find(t => t.value === selectedTag)?.label || 'issue'}`
                      : `Filtering orders for ${TAG_OPTIONS.find(t => t.value === selectedTag)?.label || 'selected issue'}`}
                  </span>
                </p>
              </div>
            )}

            {/* Search Results Dropdown - Absolutely positioned above search */}
            {!selectedOrder && searchQuery && (
              <div className="absolute bottom-full left-0 right-0 mb-1 z-50">
                {isLoadingOrders ? (
                  <div className="flex items-center justify-center py-8 border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-dark shadow-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Searching...</span>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-dark shadow-lg">
                    <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No matching orders found</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try searching by order number (e.g., #1001)</p>
                  </div>
                ) : (
                  <div className="border border-gray-300 dark:border-[#4a4a4a] rounded-lg max-h-64 overflow-y-auto bg-white dark:bg-dark shadow-lg">
                    {orders.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setSelectedOrder(order);
                          setSearchQuery('');
                          setOrders([]);
                        }}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors border-b border-gray-200 dark:border-[#333333] last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-gray-400" />
                          <div className="text-left">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {order.order_number}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-medium">
                                {(order.customer_first_name || order.customer_last_name) ? (
                                  [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ')
                                ) : order.customer_email ? (
                                  order.customer_email.split('@')[0].charAt(0).toUpperCase() + order.customer_email.split('@')[0].slice(1)
                                ) : (
                                  'Guest Customer'
                                )} • {' '}
                              </span>
                              {formatDate(order.ordered_at)}
                            </p>
                          </div>
                        </div>
                        <span className="font-medium text-gray-600 dark:text-gray-300">
                          {formatCurrency(order.total_price, order.currency)}
                        </span>
                      </button>
                    ))}
                    {orders.length === 10 && (
                      <div className="px-4 py-2 text-xs text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark">
                        Showing top 10 results. Refine your search for more specific results.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Order Display - Only takes space when shown */}
          {selectedOrder && (
            <div className="mb-3 border border-red-300 dark:border-red-700/60 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-100">
                      {selectedOrder.order_number}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      <span className="font-medium">
                        {(selectedOrder.customer_first_name || selectedOrder.customer_last_name) ? (
                          [selectedOrder.customer_first_name, selectedOrder.customer_last_name].filter(Boolean).join(' ')
                        ) : selectedOrder.customer_email ? (
                          selectedOrder.customer_email.split('@')[0].charAt(0).toUpperCase() + selectedOrder.customer_email.split('@')[0].slice(1)
                        ) : (
                          'Guest Customer'
                        )} • {' '}
                      </span>
                      {formatDate(selectedOrder.ordered_at)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-red-900 dark:text-red-100">
                    {formatCurrency(selectedOrder.total_price, selectedOrder.currency)}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedOrderId('');
                      setSelectedOrder(null);
                      setSearchQuery('');
                      setOrders([]);
                    }}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline mt-0.5"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Footer - Full Width Sticky */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#2a2a2a]/50 px-6 py-4 flex justify-between">
        <button
          type="button"
          onClick={handleClose}
          disabled={isCreating}
          className="btn btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4 btn-icon btn-icon-back" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!selectedOrderId || !selectedTag || isCreating}
          className="group btn btn-primary flex items-center gap-2"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 btn-icon animate-spin" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <span>Create Thread</span>
              <ArrowRight className="w-4 h-4 btn-icon btn-icon-arrow" />
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
