import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle, Loader2, Tag as TagIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import { supabase } from '@/lib/supabase';

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
  { value: 'replacement', label: 'Replacement', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600' },
];

export function CreateThreadModal({
  isOpen,
  onClose,
  chatId,
  userId,
  onThreadCreated,
}: CreateThreadModalProps) {
  const [description, setDescription] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen && !userId) {
      setOrders([]);
      setSearchQuery('');
    }
  }, [isOpen, userId]);

  const searchOrders = async (query: string) => {
    if (!userId || !query.trim()) {
      setOrders([]);
      return;
    }

    setIsLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('shopify_orders')
        .select('id, shopify_order_id, order_number, total_price, ordered_at, currency, customer_first_name, customer_last_name, customer_email')
        .eq('user_id', userId)
        .ilike('order_number', `%${query}%`)
        .order('ordered_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Error searching orders:', error);
      toast.error('Failed to search orders');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchOrders(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, userId]);

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

      // Skip welcome message if a conversational flow will auto-start
      const flowTags = [
        'return',
        'damaged',
        'defective',
        'cancel_modify',
        'wrong_item',
        'missing_items',
        'shipping',
        'refund',
        'replacement'
      ];
      const willAutoStartFlow = threadData.tag && flowTags.includes(threadData.tag.toLowerCase());

      if (!willAutoStartFlow) {
        // Send automated welcome message for the thread
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
            // Don't fail the thread creation if message fails
          }
        }
      }

      toast.success('Thread created successfully');
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Issue Thread">
      <div className="pb-20">
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
                    : 'bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 text-gray-700 dark:text-gray-300 hover:shadow-md border-gray-200/60 dark:border-gray-700/60'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Order Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Related Order *
          </label>

          {/* Search Input */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search order number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>

          {/* Selected Order Display */}
          {selectedOrder && (
            <div className="mb-3 border-2 border-pink-500 dark:border-pink-600 bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  <div>
                    <p className="font-medium text-pink-900 dark:text-pink-100">
                      {selectedOrder.order_number}
                    </p>
                    <p className="text-xs text-pink-700 dark:text-pink-300">
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
                  <p className="font-medium text-pink-900 dark:text-pink-100">
                    {formatCurrency(selectedOrder.total_price, selectedOrder.currency)}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedOrderId('');
                      setSelectedOrder(null);
                      setSearchQuery('');
                      setOrders([]);
                    }}
                    className="text-xs text-pink-600 dark:text-pink-400 hover:underline mt-0.5"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {!selectedOrder && searchQuery && (
            <>
              {isLoadingOrders ? (
                <div className="flex items-center justify-center py-8 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Searching...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No matching orders found</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try searching by order number (e.g., #1001)</p>
                </div>
              ) : (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-64 overflow-y-auto">
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        setSelectedOrder(order);
                        setSearchQuery('');
                        setOrders([]);
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0"
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
                    <div className="px-4 py-2 text-xs text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                      Showing top 10 results. Refine your search for more specific results.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>

      </div>

      {/* Footer - Full Width Sticky */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-6 py-4 flex justify-between">
        <button
          type="button"
          onClick={handleClose}
          disabled={isCreating}
          className="px-5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!selectedOrderId || !selectedTag || isCreating}
          className="group px-5 py-1.5 text-sm font-medium text-white bg-gray-800 dark:bg-gray-600 border border-gray-700 dark:border-gray-500 hover:bg-gray-900 hover:border-gray-800 dark:hover:bg-gray-700 dark:hover:border-gray-600 hover:shadow-md rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <span>Create Thread</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
