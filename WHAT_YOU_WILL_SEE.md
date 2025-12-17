# What You'll Actually See Now

## Before vs After

### BEFORE (What you saw in the screenshots)
```
Agent sees:
- "Upload photos" ✓
- "Loading warranty..." ✓
- "No order linked" message ✓
- "What type of damage?" buttons ✓
- Basic resolution text ✓

That's it. No guidance, no reasoning, no next steps.
```

### AFTER (What you'll see now)

When the agent selects a damage type and reaches a resolution node, they'll see:

```
┌─────────────────────────────────────────────────┐
│ Basic resolution text (same as before)          │
└─────────────────────────────────────────────────┘
                    ↓
            NEW GUIDANCE PANEL
                    ↓
┌─────────────────────────────────────────────────┐
│ ✅ FREE REPLACEMENT                              │
│ Resolution type badge with color                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 🔴 IMMEDIATE ACTION REQUIRED                     │
│ Urgency indicator                                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 💡 AI ANALYSIS                                   │
│                                                  │
│ "Shipping damage is always covered by carrier   │
│ insurance or shipping protection policy."        │
│                                                  │
│ ✓ High Confidence                                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ NEXT STEPS:                                      │
│                                                  │
│ 1️⃣ Generate replacement order in system          │
│ 2️⃣ File carrier claim if applicable (>$100)      │
│ 3️⃣ Send replacement notification to customer     │
│ 4️⃣ Close thread once shipped                     │
└─────────────────────────────────────────────────┘

Recommended Email Templates:
[damage_replacement_approved] [replacement_shipment]
```

## Different Scenarios Show Different Guidance

### Scenario 1: Shipping Damage
```
✅ FREE REPLACEMENT
🔴 IMMEDIATE ACTION REQUIRED
High Confidence

Reasoning: "Shipping damage is always covered by carrier
insurance or shipping protection policy."

Next Steps:
1. Generate replacement order in system
2. File carrier claim if applicable
3. Send replacement shipment notification
4. Close thread once shipped
```

### Scenario 2: Manufacturing Defect + Expired Warranty
```
⏰ FACTORY REVIEW REQUIRED
🟢 RESPOND WITHIN 48 HOURS
High Confidence

Reasoning: "Warranty expired but factories typically cover
manufacturing defects as goodwill."

Next Steps:
1. Forward photos to factory contact
2. Include order age and defect description
3. Pause thread and await factory decision (24-48h)
4. Resume with factory guidance
```

### Scenario 3: Customer Caused Damage
```
❌ NOT COVERED
🟡 RESPOND WITHIN 24 HOURS
High Confidence

Reasoning: "Damage occurred after delivery. Outside warranty
and shipping protection scope."

Next Steps:
1. Choose resolution: paid replacement, partial refund, or politely decline
2. Use professional email template to explain
3. Offer paid replacement at cost if customer interested
4. Document in thread
```

## When Does It Appear?

The guidance panel appears automatically when:

1. Agent uploads damage photos ✓
2. System loads warranty data ✓
3. Agent selects damage type (Shipping, Manufacturing, Customer, Unclear) ✓
4. Flow advances to resolution node ← **THIS IS WHERE YOU SEE IT**

## What Triggers the Intelligence?

```
User Action: Selects "Manufacturing Defect"
     ↓
System: Loads order warranty status
     ↓
Decision Engine: Analyzes warranty + damage type
     ↓
Result: "Active warranty + defect = Auto-approve"
     ↓
UI: Shows guidance panel with reasoning & steps
```

## Technical Flow

```javascript
// When agent reaches resolution node:
1. FlowMessage detects node.metadata.resolution exists
2. Loads thread ID from session
3. Fetches damage type from flow state
4. Calls getDamageResolutionGuidance(threadId, damageType)
5. Decision engine analyzes:
   - Order warranty status (active/expired)
   - Damage type (shipping/defect/customer/unclear)
   - Coverage details
6. Returns guidance object:
   {
     resolution: "free_replacement",
     reasoning: "Active warranty covers defects",
     urgency: "immediate",
     confidence: "high",
     nextSteps: [...]
   }
7. FlowGuidancePanel renders the guidance beautifully
```

## Why It Wasn't Working Before

Your screenshots showed the flow was working BUT:
- The guidance services existed but weren't connected to UI ❌
- FlowGuidancePanel component existed but was never rendered ❌
- getDamageResolutionGuidance was never called ❌

Now it's all wired up correctly:
- FlowMessage imports FlowGuidancePanel ✓
- Detects resolution nodes automatically ✓
- Loads damage type from flow state ✓
- Calls guidance service ✓
- Renders guidance panel ✓

## Test It

1. Create a thread linked to an order with active warranty
2. Start damage flow
3. Upload photos
4. Select "Manufacturing Defect"
5. **Look for the colorful guidance panel below the resolution text**

You should now see:
- Green "Free Replacement" badge
- Red "Immediate" urgency indicator
- AI reasoning explanation
- Numbered next steps
- Email template suggestions

That's the intelligence you were missing!
