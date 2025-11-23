# Rex Modal Structure Reference

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   [Rex Character]                                                   │
│   (Animated, floating                                               │
│    outside modal)              ┌───────────────────────────────┐   │
│         │                      │        MODAL WINDOW           │   │
│         │  ←─ connection       │                               │   │
│         │     line             │  [Header]                     │   │
│                                │  • Dynamic title              │   │
│                                │  • View toggle (S/D/F)        │   │
│                                │  • Close button               │   │
│                                │                               │   │
│                                │  ┌─────────────────────────┐ │   │
│                                │  │  Hero Statement         │ │   │
│                                │  │  ✨ Big, bold finding  │ │   │
│                                │  └─────────────────────────┘ │   │
│                                │                               │   │
│                                │  [Data Section]               │   │
│                                │  • Analysis paragraph         │   │
│                                │  • 3 cards (Simple)           │   │
│                                │  • Full breakdown (Detailed)  │   │
│                                │  • Flow diagram (Flow)        │   │
│                                │                               │   │
│                                │  [Actions Section]            │   │
│                                │  ┌───────────────────────┐   │   │
│                                │  │ ⬆ Primary Action    ➤│   │   │
│                                │  │ Bold, rose border     │   │   │
│                                │  │ Impact: +$X revenue   │   │   │
│                                │  └───────────────────────┘   │   │
│                                │  ┌───────────────────────┐   │   │
│                                │  │ Secondary Action     ➤│   │   │
│                                │  └───────────────────────┘   │   │
│                                │                               │   │
│                                │  [Optional Automation]        │   │
│                                │  💡 "Want me to watch..."     │   │
│                                │  [Create Rule Button]         │   │
│                                │                               │   │
│                                │  [Dismiss]                    │   │
│                                │  "I'll handle this myself"    │   │
│                                └───────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
ComprehensiveRexInsightsModal
├── RexCharacter (positioned outside, fixed)
│   └── Emotion-based animations
│
└── Modal
    ├── Header
    │   ├── Rex Avatar (mobile only)
    │   ├── Dynamic Title
    │   ├── View Mode Toggle
    │   │   ├── Simple
    │   │   ├── Detailed
    │   │   └── Flow
    │   └── Close Button
    │
    ├── Hero Statement
    │   └── Primary Insight (bold, prominent)
    │
    ├── Content Views
    │   ├── Simple View
    │   │   ├── Section Header + Analysis
    │   │   └── 3 Data Cards
    │   │
    │   ├── Detailed View
    │   │   ├── Demographics Section
    │   │   ├── Geographic Section
    │   │   ├── Placements Section
    │   │   ├── Temporal Section
    │   │   └── Customer Behavior Section
    │   │
    │   └── Flow View
    │       └── RexFlowDiagram
    │           ├── Data Collection
    │           ├── Pattern Detection
    │           ├── Analysis
    │           ├── Recommendation
    │           └── Expected Outcome
    │
    ├── Actions Section
    │   └── Vertical List
    │       ├── Primary Action (rose border)
    │       ├── Secondary Action(s)
    │       └── Each shows: Icon, Title, Description, Impact
    │
    ├── Optional Automation Callout
    │   ├── Conversational Header
    │   ├── Rule Summary
    │   └── Create Rule Button
    │
    └── Dismiss Link
        └── Subtle underlined text
```

## Data Flow

```
Insight Data
    ↓
┌───────────────────────────────────┐
│ Determine Rex Emotion             │
│ • Protective → Concerned          │
│ • Scaling → Excited               │
│ • Other → Thoughtful              │
└───────────────────────────────────┘
    ↓
┌───────────────────────────────────┐
│ Generate Dynamic Title            │
│ • "Rex found a winning..."        │
│ • "Rex detected a problem..."     │
│ • "Rex spotted an optimization"   │
└───────────────────────────────────┘
    ↓
┌───────────────────────────────────┐
│ Format Data for Display           │
│ • Demographics                    │
│ • Geographic                      │
│ • Placements                      │
│ • Temporal                        │
│ • Customer Behavior               │
└───────────────────────────────────┘
    ↓
┌───────────────────────────────────┐
│ Calculate Impact Projections      │
│ • Net revenue gain                │
│ • Net conversion gain             │
│ • Net profit gain                 │
└───────────────────────────────────┘
    ↓
┌───────────────────────────────────┐
│ Render View Based on Mode         │
│ • Simple: Top 3 segments          │
│ • Detailed: All breakdowns        │
│ • Flow: Analytical process        │
└───────────────────────────────────┘
    ↓
┌───────────────────────────────────┐
│ Display Actions with Priority     │
│ • Primary (first) → Rose border   │
│ • Destructive → Red accent        │
│ • Others → Gray border            │
└───────────────────────────────────┘
    ↓
┌───────────────────────────────────┐
│ Show Automation if Available      │
│ • Check if recommendedRule exists │
│ • Show contextual message         │
│ • Display rule summary            │
└───────────────────────────────────┘
```

## Responsive Breakpoints

### Desktop (>= 1024px)
- Rex character on left side (fixed position)
- 3-column data grid
- All features visible
- Connection line from Rex to modal

### Tablet (768px - 1023px)
- Rex character above modal (smaller)
- 2-column data grid
- Actions remain full width
- Simplified flow diagram

### Mobile (< 768px)
- Small Rex avatar in header
- Single column layout
- Vertical everything
- Simplified interactions
- Touch-optimized button sizes

## Color System

### Rex Emotions
- **Excited**: Green gradient (`from-green-500 via-emerald-500 to-teal-500`)
- **Concerned**: Red/Orange gradient (`from-orange-500 via-red-500 to-rose-500`)
- **Thoughtful**: Rose gradient (`from-red-500 via-rose-500 to-orange-500`)

### Action Types
- **Primary**: Rose border (`border-rose-400`), gradient background
- **Destructive**: Red border (`border-red-300`), red accents
- **Secondary**: Gray border (`border-gray-200`), neutral

### Data Cards
- **Highlight**: Rose ring (`ring-2 ring-rose-500/30`)
- **Standard**: Gray border (`border-gray-200`)
- **Hover**: Shadow increase (`hover:shadow-lg`)

## Typography Scale

- **Hero Statement**: `text-lg` (18px), `font-semibold`
- **Section Headers**: `text-base` (16px), `font-semibold`
- **Body Text**: `text-[15px]` (15px), `font-normal`
- **Action Titles**: `text-base` (16px), `font-bold`
- **Small Text**: `text-sm` (14px), `text-xs` (12px)

## Animation States

### Rex Character
- **Idle**: Gentle floating, breathing
- **Excited**: Bounce animation
- **Concerned**: Pulse animation
- **On Action**: Celebration or approval

### Modal Elements
- **Card Hover**: Shadow + Scale
- **Action Hover**: Lift + Shadow increase
- **Button Click**: Press effect
- **View Toggle**: Smooth transition

## Key Interactions

1. **View Mode Toggle**: Switches between Simple/Detailed/Flow
2. **Action Click**: Executes action, shows loading state
3. **Create Rule**: Opens rule builder
4. **Dismiss**: Closes modal with optional reason
5. **Close**: Standard modal close

## State Management

```typescript
const [isProcessing, setIsProcessing] = useState(false);
const [viewMode, setViewMode] = useState<'simple' | 'detailed' | 'flow'>('simple');

// Derived state
const rexEmotion = /* calculated based on action type */
const netGainRevenue = /* calculated from projections */
const isPrimary = /* first action */
```

## Accessibility Features

- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus visible states
- Color contrast meets WCAG AA
- Screen reader friendly structure
- Semantic HTML

## Performance Considerations

- Conditional rendering based on view mode
- Memoized calculations
- Lazy component loading opportunity
- Optimized re-renders
- CSS animations (GPU accelerated)
