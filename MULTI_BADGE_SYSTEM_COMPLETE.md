# Multi-Badge Email Template System - Complete Implementation

## Overview

The email template system now uses **intelligent multi-badge classification** based on the old naming convention that encoded order status, required actions, and special contexts directly in template titles.

## Database Schema

### New Columns Added to `email_templates`

```sql
badges TEXT[]                 -- Array of contextual badges for intelligent filtering
order_status_hints TEXT[]     -- Order statuses this template is relevant for
action_required TEXT          -- Optional action flag (e.g., "need_confirm", "need_reason")
```

## Badge Categories

### 1. Order State Badges
These indicate the current fulfillment state:
- **Not Shipped** - Order hasn't left warehouse
- **Shipped** - In transit
- **Out for Delivery** - Final mile delivery
- **Delivered** - Confirmed delivery
- **Returned to Sender** - Package bounced back

### 2. Action Required Badges
These signal what the customer needs to do:
- **Need Confirm** - Waiting for customer confirmation
- **Need Reason** - Need more info from customer
- **Need WEN** - Need Warehouse Entry Number
- **Notify Supplier** - Supplier action required

### 3. Context/Flag Badges
Special circumstances and flags:
- **Took Upsell** - Customer accepted upsell
- **Invalid Address** - Address issue detected
- **Chargeback** - Dispute filed
- **Delivery Exception** - Carrier issue
- **Address Issue** - Address needs correction
- **Partial Refund** - Partial refund scenario
- **Full Refund** - Full refund scenario
- **Warranty Issue** - Warranty-related
- **Expedited** - Rush/expedited handling

## Example Templates with Badges

### Template: "Order Status: Out for Delivery"
```
Badges: ["Out for Delivery"]
Order Status Hints: ["out_for_delivery"]
```

### Template: "Return Request: Need Confirm"
```
Badges: ["Need Confirm"]
Order Status Hints: ["shipped", "delivered"]
Action Required: "need_confirm"
```

### Template: "Cancel Upsell Item: Not Shipped"
```
Badges: ["Not Shipped", "Took Upsell", "Partial Refund"]
Order Status Hints: ["pending", "not_shipped"]
```

### Template: "Delivery Exception: Invalid Address"
```
Badges: ["Returned to Sender", "Invalid Address", "Delivery Exception"]
Order Status Hints: ["returned"]
```

### Template: "Chargeback Notice: Shipped with Upsell"
```
Badges: ["Shipped", "Chargeback", "Took Upsell"]
Order Status Hints: ["shipped"]
```

## UI Component - Badge Display

The `TemplateBadges` component renders multiple badges with smart coloring:

```tsx
<TemplateBadges badges={template.badges} />
```

### Badge Color Mapping

**Order State Badges:**
- Not Shipped → Slate
- Shipped → Amber
- Out for Delivery → Green
- Delivered → Teal
- Returned to Sender → Red

**Action Required Badges:**
- Need Confirm/Reason/WEN → Blue
- Notify Supplier → Cyan

**Context/Flag Badges:**
- Took Upsell → Emerald
- Address Issues → Orange
- Chargeback → Rose
- Delivery Exception → Red
- Refunds → Violet
- Warranty Issue → Indigo
- Expedited → Yellow
- Follow Up → Gray

## Template Filtering Logic

Templates can be intelligently filtered by:

1. **Order Status** - Match against `order_status_hints`
2. **Badge Types** - Filter by specific badges
3. **Action Required** - Filter by required customer action
4. **Multiple Badges** - Templates with multiple badges match ANY of the searched badges

### Example Filter Queries

```typescript
// Find templates for shipped orders
const { data } = await supabase
  .from('email_templates')
  .select('*')
  .contains('order_status_hints', ['shipped']);

// Find templates needing customer confirmation
const { data } = await supabase
  .from('email_templates')
  .select('*')
  .eq('action_required', 'need_confirm');

// Find templates with specific badges
const { data } = await supabase
  .from('email_templates')
  .select('*')
  .contains('badges', ['Took Upsell']);
```

## Smart Template Suggestions

The system can now suggest templates based on:

1. **Thread Context** - If thread has order assigned, check order's fulfillment status
2. **Badge Matching** - Match thread tags/flags against template badges
3. **Order Status** - Prioritize templates matching current order state
4. **Usage Frequency** - Factor in `usage_count` for popular templates

## Implementation in ScenarioTemplateModal

### Key Changes Needed:

1. **Fetch from Database** instead of hardcoded TEMPLATES array:
```typescript
const [templates, setTemplates] = useState<EmailTemplate[]>([]);

useEffect(() => {
  async function loadTemplates() {
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });

    setTemplates(data || []);
  }
  loadTemplates();
}, []);
```

2. **Display Multiple Badges** on each template card:
```tsx
<div className="absolute top-3 right-3">
  <TemplateBadges badges={template.badges} />
</div>
```

3. **Add Badge Filter UI**:
```tsx
<div className="mb-4">
  <h4 className="text-sm font-medium mb-2">Filter by Badge:</h4>
  <div className="flex flex-wrap gap-2">
    {ALL_BADGES.map(badge => (
      <button
        key={badge}
        onClick={() => toggleBadgeFilter(badge)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium ${
          selectedBadges.includes(badge)
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
        }`}
      >
        {badge}
      </button>
    ))}
  </div>
</div>
```

4. **Smart Sorting** based on badge relevance:
```typescript
const sortedTemplates = templates.sort((a, b) => {
  // Prioritize templates matching current order status
  const aMatches = a.order_status_hints.includes(currentOrderStatus);
  const bMatches = b.order_status_hints.includes(currentOrderStatus);
  if (aMatches && !bMatches) return -1;
  if (!aMatches && bMatches) return 1;

  // Then by usage count
  return b.usage_count - a.usage_count;
});
```

## Benefits

1. **Contextual Relevance** - Templates automatically tagged with their relevant order states
2. **Quick Filtering** - Find the right template faster with badge-based filters
3. **Visual Clarity** - Multiple badges show ALL relevant contexts at a glance
4. **Smart Suggestions** - System can auto-suggest based on order state + context
5. **Scalable** - Easy to add new badges and templates as needs evolve

## Next Steps

1. Implement badge filtering UI in ScenarioTemplateModal
2. Add smart template recommendations based on order status
3. Create admin interface to manage badges
4. Add analytics to track which badge combinations are most useful
5. Consider auto-tagging based on template content analysis

## Migration Applied

- ✅ `add_multi_badge_system_to_email_templates`
- ✅ `add_comprehensive_scenario_templates_with_badges`

All existing templates have been updated with appropriate badges based on their scenarios and order states!
