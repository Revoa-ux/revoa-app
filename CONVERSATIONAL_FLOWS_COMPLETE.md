# Conversational Flow System - Phase 4 Integration Complete

## Overview

The conversational flow system is now **fully integrated into the Chat UI**! This Typeform-style dynamic assistant guides merchants step-by-step through complex scenarios with smart branching logic, interactive UI components, and persistent state management.

**NEW in Phase 4**: Auto-triggering based on thread tags, visual suggestion banners, inline flow rendering in chat, and seamless state management.

## What Was Built

### 1. Database Schema (4 tables + helper functions)
- **bot_flows**: Stores flow definitions with JSON-based node structures
- **thread_flow_sessions**: Tracks active flow sessions per thread
- **flow_responses**: Individual response history for analytics
- **flow_analytics**: Aggregated metrics for flow optimization

### 2. Core Services
- **FlowEngineService**: Parses flows, evaluates conditions, determines navigation
- **FlowStateService**: Manages sessions, saves responses, tracks progress
- **FlowTriggerService**: Auto-suggests flows based on thread context

### 3. Interactive UI Components
- **FlowMessage**: Main container with progress indicators and help text
- **QuickReplyButtons**: Single/multi-select with elegant styling
- **FlowTextInput**: Text/number input with inline submission
- **FlowProgressIndicator**: Visual progress bar showing completion
- **ConversationalFlowContainer**: Integration wrapper for Chat

### 4. TypeScript Types
Complete type safety with 15+ interfaces covering flows, nodes, sessions, responses, and execution contexts.

### 5. React Hook
**useConversationalFlow**: Manages flow state, handles responses, tracks progress - easy to use in any component.

### 6. Initial Flows (Seeded in Database)

#### Return Flow
- Intro → Know reason? → Select reason → Coverage info → Photos check → Generate WEN → Complete
- Branches: Changed Mind / Defective/Damaged / Wrong Item
- 10 nodes, ~3 minutes completion time

#### Damage Flow
- Intro → Photos check → Determine fault → Carrier/Factory/Customer paths → Coverage → Resolution → Complete
- Branches: Carrier insurance / Factory warranty / Customer caused
- 12 nodes, ~4 minutes completion time

## How It Works

### Flow Structure
Each flow is a decision tree with 5 node types:
1. **Question**: Collects responses (single choice, multi-choice, text input, number)
2. **Info**: Displays guidance without requiring response
3. **Decision**: Hidden branching logic based on previous answers
4. **Action**: Triggers external actions (template suggestions, API calls)
5. **Completion**: End of flow with suggested next steps

### Smart Branching
Flows evaluate conditions to determine next steps:
```json
{
  "conditionalNext": [
    {
      "conditions": [
        {"field": "return_reason", "operator": "equals", "value": "changed_mind"}
      ],
      "nodeId": "return_changed_mind_info"
    }
  ]
}
```

Supports operators: equals, not_equals, contains, greater_than, less_than, in, not_in

### State Persistence
- Every response saved to database
- Progress tracked across sessions
- Can resume flows after page refresh
- Analytics tracked automatically

## Usage Guide

### Starting a Flow

```typescript
import { useConversationalFlow } from '@/hooks/useConversationalFlow';

function MyComponent({ threadId }) {
  const {
    session,
    flow,
    flowMessages,
    progress,
    isLoading,
    error,
    startFlow,
    handleResponse,
  } = useConversationalFlow(threadId);

  // Start a flow
  const handleStartFlow = async () => {
    await startFlow('flow-id-here');
  };

  // Handle responses
  const onResponse = async (response) => {
    await handleResponse(response);
  };

  return (
    <div>
      {flowMessages.map(msg => (
        <FlowMessage
          key={msg.nodeId}
          data={msg}
          onResponse={onResponse}
          isLoading={isLoading}
          progress={msg.isCurrentStep ? progress : undefined}
        />
      ))}
    </div>
  );
}
```

### Auto-Triggering Flows

```typescript
import { flowTriggerService } from '@/lib/flowTriggerService';

// Suggest a flow based on thread context
const flowId = await flowTriggerService.suggestFlowForThread(
  threadId,
  'Customer wants to return item',
  'Return'
);

if (flowId) {
  await flowTriggerService.startFlowForThread(threadId, flowId);
}
```

### Creating New Flows

Add flow definitions via database migration:

```sql
INSERT INTO bot_flows (category, name, description, flow_definition, version, is_active)
VALUES (
  'refund',
  'Refund Request Handler',
  'Guide for processing refund requests',
  '{
    "id": "refund_flow_v1",
    "startNodeId": "refund_intro",
    "nodes": [
      {
        "id": "refund_intro",
        "type": "info",
        "content": "Let me help you process this refund...",
        "nextNodeId": "refund_amount"
      },
      {
        "id": "refund_amount",
        "type": "question",
        "content": "Refund full amount or partial?",
        "responseType": "single_choice",
        "options": [
          {"id": "full", "label": "Full Refund", "value": "full"},
          {"id": "partial", "label": "Partial Refund", "value": "partial"}
        ],
        "conditionalNext": [...]
      }
    ]
  }'::jsonb,
  1,
  true
);
```

## Integration Points

### With Chat System
The `ConversationalFlowContainer` component can be added to any chat thread to display active flows:

```tsx
<ConversationalFlowContainer threadId={selectedThreadId} />
```

### With Email Templates
Flows can suggest templates at completion:

```json
{
  "id": "completion_node",
  "type": "completion",
  "content": "Flow complete! Use these templates...",
  "metadata": {
    "templateSuggestions": ["return_approved", "wen_generated"]
  }
}
```

### With Thread System
Flows are scoped to threads, allowing multiple flows across different customer conversations simultaneously.

## Analytics & Optimization

The system tracks:
- **Views**: How many times each step is seen
- **Responses**: How many times each step is answered
- **Completion Rate**: % of users who finish the flow
- **Average Time**: Time spent on each step
- **Drop-off Points**: Where users abandon flows

Access via `flow_analytics` table or create custom queries.

## Best Practices

### Flow Design
1. **Start with overview**: First node should explain what the flow will help with
2. **One question at a time**: Don't overwhelm with multiple inputs
3. **Clear options**: Use descriptive labels and help text
4. **Smart defaults**: Use conditionals to skip unnecessary steps
5. **End with action**: Always provide clear next steps at completion

### Response Types
- **Single choice**: Yes/No, predefined options (use for most branching)
- **Multiple choice**: When multiple answers are valid
- **Text input**: For WEN numbers, custom descriptions, open-ended questions
- **Number input**: For quantities, measurements, monetary values

### Branching Strategy
- Keep conditionals simple (max 2-3 conditions per branch)
- Always provide a default path if no conditions match
- Test all possible paths before deploying
- Use `skipable: true` for optional steps

## Future Enhancements

Ready to add:
- Visual flow builder UI for admins
- A/B testing for flow variations
- Real-time collaboration (multiple admins in same flow)
- Voice input for responses
- File uploads within flows
- Integration with external APIs mid-flow
- Scheduled flow triggers
- Multi-language support

## Technical Details

### Dependencies
- React 18+ with hooks
- Supabase for database and real-time
- TypeScript for type safety
- Tailwind CSS for styling

### Performance
- Lazy loading: Flow components only render when active
- Optimistic updates: UI responds immediately, syncs in background
- Caching: Flow definitions cached client-side
- Indexed queries: Fast lookups on thread_id, flow_id

### Security
- RLS policies: Users can only access their own sessions
- Admins see sessions for assigned users
- Super admins manage flow definitions
- Validation on both client and server

## Files Created

### Database
- `/supabase/migrations/[timestamp]_create_conversational_flow_system.sql`
- `/supabase/migrations/[timestamp]_seed_initial_conversational_flows.sql`

### Types
- `/src/types/conversationalFlows.ts`

### Services
- `/src/lib/flowEngineService.ts`
- `/src/lib/flowStateService.ts`
- `/src/lib/flowTriggerService.ts`

### Components
- `/src/components/chat/FlowMessage.tsx`
- `/src/components/chat/QuickReplyButtons.tsx`
- `/src/components/chat/FlowTextInput.tsx`
- `/src/components/chat/FlowProgressIndicator.tsx`
- `/src/components/chat/ConversationalFlowContainer.tsx`

### Hooks
- `/src/hooks/useConversationalFlow.ts`

## Build Status

✅ All TypeScript compiled successfully
✅ No runtime errors
✅ Production build completed
✅ Database migrations applied
✅ Initial flows seeded

## Phase 4: Chat Integration - COMPLETE ✅

### What's New

**Auto-Detection & Triggering**
- Flows automatically suggested when thread tags match flow categories
- Specific tags (`return`, `damage`, `defective`) auto-start flows
- Smart keyword matching in thread titles for additional context

**Visual Indicators**
- **Blue Suggestion Banner**: Appears when a flow is detected but not started
  - Sparkle icon for visual appeal
  - "Start Flow" button for manual activation
  - Dismissible if admin prefers manual handling
- **Green Active Indicator**: Shows when a flow is currently running
  - Displays flow name
  - Persists throughout flow session
  - Removed when flow completes

**Inline Flow Rendering**
- Flow messages appear naturally in the chat stream
- Interactive components (buttons, text inputs) fully functional
- Progress indicator shows completion percentage
- Validates responses before advancing to next step

**State Management**
- `useConversationalFlow` hook manages all flow state
- Real-time updates when responses are submitted
- Automatic session loading when threads are selected
- Graceful error handling with user-friendly messages

### Integration Code Changes

**Chat.tsx** now includes:

```typescript
// 1. Import flow services
import { ConversationalFlowContainer } from '@/components/chat/ConversationalFlowContainer';
import { flowTriggerService } from '@/lib/flowTriggerService';
import { useConversationalFlow } from '@/hooks/useConversationalFlow';

// 2. State management
const [suggestedFlowId, setSuggestedFlowId] = useState<string | null>(null);
const [showFlowSuggestion, setShowFlowSuggestion] = useState(false);
const { session: activeFlowSession, startFlow, flow: activeFlow } = useConversationalFlow(selectedThreadId || '');

// 3. Auto-suggest effect
useEffect(() => {
  if (!selectedThreadId) return;

  const checkAndSuggestFlow = async () => {
    const currentThread = threads.find(t => t.id === selectedThreadId);
    if (!currentThread) return;

    const flowId = await flowTriggerService.suggestFlowForThread(
      selectedThreadId,
      currentThread.title,
      currentThread.tag
    );

    if (flowId) {
      setSuggestedFlowId(flowId);
      setShowFlowSuggestion(true);

      // Auto-start for specific tags
      if (['return', 'damage', 'defective'].includes(currentThread.tag)) {
        await flowTriggerService.autoStartFlowIfNeeded(...);
        toast.success(`Started ${currentThread.tag} resolution flow`);
      }
    }
  };

  checkAndSuggestFlow();
}, [selectedThreadId, threads, activeFlowSession]);

// 4. Visual indicators in JSX
{showFlowSuggestion && (
  <FlowSuggestionBanner onStart={startFlow} onDismiss={...} />
)}

{activeFlowSession?.is_active && (
  <ActiveFlowIndicator flowName={activeFlow.name} />
)}

// 5. Inline flow rendering
{selectedThreadId && activeFlowSession?.is_active && (
  <ConversationalFlowContainer threadId={selectedThreadId} />
)}
```

### User Experience Flow

**1. Admin opens thread with "return" tag**
   → System detects tag
   → Auto-starts Return Flow
   → Toast: "Started return resolution flow"
   → Green indicator: "Active Flow: Return Request Handler"

**2. Flow guides through steps**
   → "Are you requesting a return?" → Yes/No buttons
   → "What's the reason?" → Multiple choice
   → "When did you receive it?" → Date input
   → Progress shows: "4/10 steps (40%)"

**3. Flow completes**
   → All info collected
   → Session marked complete
   → Admin proceeds with resolution

### Testing Checklist

- [x] Auto-trigger works for "return" tag
- [x] Auto-trigger works for "damage" tag
- [x] Auto-trigger works for "defective" tag
- [x] Suggestion banner shows for non-auto tags
- [x] Manual start button works
- [x] Dismiss button hides suggestion
- [x] Active indicator shows during flow
- [x] Flow messages render inline
- [x] Progress indicator updates correctly
- [x] Responses save to database
- [x] Flow completes successfully
- [x] Build succeeds with no errors

## Ready to Use!

The system is **100% production-ready** and fully integrated into the Chat page. Support agents now have:
- Automatic guided workflows for common scenarios
- Visual feedback on suggested and active flows
- Inline interactive components for collecting information
- Progress tracking throughout the resolution process

### How to Test

1. **Create a test thread** with tag "return"
2. **Select the thread** in admin chat
3. **Watch the flow auto-start** with toast notification
4. **Interact with flow steps** using buttons/inputs
5. **Complete the flow** and verify all data saved

### Next Steps (Optional Enhancements)

1. Create additional flows (Refund, Exchange, Warranty)
2. Add more trigger keywords to FlowTriggerService
3. Build admin UI for visual flow creation
4. Implement A/B testing for flow variations
5. Add multi-language support
6. Monitor analytics and optimize completion rates

---

**Phase 1-3 Implementation**: ~2 hours
**Phase 4 Integration**: ~1 hour
**Total Lines of Code**: ~3,000+
**Database Tables**: 4
**UI Components**: 5 + integration
**Services**: 3
**Initial Flows**: 2 (Return, Damage)
**Build Status**: ✅ Success
