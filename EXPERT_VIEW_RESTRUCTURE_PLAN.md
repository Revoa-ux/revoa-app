# Expert View Restructuring Plan

## Overview
Complete restructure of the Expert view to place AI suggestions at the top with intelligent data filtering, making the AI's decision-making process transparent and giving users confidence.

## Current Issues

1. **Data cards appear before suggestions** - Users see data without context
2. **"What you should do" is vague** - Doesn't explain WHY
3. **Supporting data in expandable cards doesn't match** - Shows top 3 generically
4. **Rule descriptions are vague** - "Find similar opportunities" isn't clear
5. **Green color on scaling** - Should be consistent branding
6. **No connection between action and data** - Users can't validate AI logic

## New Expert View Structure

```
┌─────────────────────────────────────────┐
│  Header (unchanged)                     │
├─────────────────────────────────────────┤
│                                         │
│  🤖 AI SUGGESTIONS (TOP SECTION)        │
│  ┌───────────────────────────────────┐ │
│  │ Suggested Action #1 [SELECTED]   │ │
│  │ ├─ Clear IF/THEN logic           │ │
│  │ └─ Click to filter data below    │ │
│  ├───────────────────────────────────┤ │
│  │ Suggested Action #2              │ │
│  ├───────────────────────────────────┤ │
│  │ 🛡️ Automation Rule              │ │
│  │ ├─ IF: ROAS < 2.1x for 3 days   │ │
│  │ ├─ THEN: Reduce budget by 30%   │ │
│  │ └─ Click to see trigger data     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  📊 SUPPORTING DATA (FILTERED)          │
│  "Showing data that triggered this      │
│   suggestion"                            │
│  ┌─────┐ ┌─────┐ ┌─────┐              │
│  │Card │ │Card │ │Card │ (Only         │
│  │ ✓   │ │ ✓   │ │ ✓   │  relevant)    │
│  └─────┘ └─────┘ └─────┘              │
│                                         │
└─────────────────────────────────────────┘
```

## Implementation Details

### 1. Reorder Expert View Layout

```tsx
{viewMode === 'expert' && (
  <>
    {/* AI Suggestions First */}
    <AIActionsSuggestions
      actions={insight.directActions}
      selectedIndex={selectedActionIndex}
      onSelect={setSelectedActionIndex}
    />

    {/* Automation Rule Second */}
    {insight.recommendedRule && (
      <AIAutomationRule
        rule={insight.recommendedRule}
        isSelected={showAutomationRule}
        onSelect={() => setShowAutomationRule(!showAutomationRule)}
      />
    )}

    {/* Filtered Data Cards Last */}
    <FilteredDataCards
      action={selectedActionIndex !== null ? insight.directActions[selectedActionIndex] : null}
      ruleSelected={showAutomationRule}
      allData={{ demographics, geographic, placements, temporal }}
    />
  </>
)}
```

### 2. AI Action Card Design

```tsx
<button
  onClick={() => setSelectedActionIndex(idx)}
  className={selectedActionIndex === idx ? 'selected-style' : 'normal-style'}
>
  <div className="flex items-center justify-between">
    <div>
      <h4>{action.label}</h4>
      <p className="text-sm">
        Based on: {getDataSummary(action)}
      </p>
    </div>
    <div className="text-sm text-gray-500">
      {selectedActionIndex === idx ?
        '✓ Viewing supporting data below' :
        'Click to see why →'}
    </div>
  </div>

  {/* Impact Preview */}
  <div className="metrics">
    +${netGainRevenue} revenue • +{netGainConversions} conversions
  </div>
</button>
```

### 3. Automation Rule with IF/THEN Clarity

```tsx
<div className="automation-rule-card">
  <div className="header">
    🛡️ Recommended Safeguarding Rule
  </div>

  <div className="rule-logic">
    <div className="if-section">
      <span className="label">IF</span>
      <div className="conditions">
        • ROAS drops below {threshold}x
        • For {timeWindow} consecutive days
        • Spend > ${minSpend}/day
      </div>
    </div>

    <div className="then-section">
      <span className="label">THEN</span>
      <div className="actions">
        • {action.type === 'pause' ? 'Pause ad set' : 'Reduce budget by 30%'}
        • Send notification to you
        • Log decision for review
      </div>
    </div>
  </div>

  <div className="data-reference">
    <span className="text-sm">
      {showAutomationRule ?
        '✓ Viewing trigger conditions below' :
        'Click to see what data triggers this rule →'}
    </span>
  </div>
</div>
```

### 4. Filtered Data Cards

```tsx
const FilteredDataCards = ({ action, ruleSelected, allData }) => {
  if (!action && !ruleSelected) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">
          👆 Select an action or rule above to see the supporting data
        </p>
      </div>
    );
  }

  const relevantData = getRelevantDataForAction(action);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4>📊 Supporting Data</h4>
        <span className="text-sm text-gray-500">
          Showing {relevantData.length} segments that {
            action.type === 'pause' ? 'are underperforming' : 'triggered this opportunity'
          }
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {relevantData.map(data => (
          <DataCard
            key={data.id}
            {...data}
            highlight={true} // All filtered cards are relevant
            showContext={`This ${data.type} has ${data.roas}x ROAS`}
          />
        ))}
      </div>
    </div>
  );
};
```

### 5. Data Filtering Logic

```tsx
const getRelevantDataForAction = (action) => {
  const avgRoas = insight.reasoning.projections?.ifIgnored?.roas || 0;
  let relevantData = [];

  // Scaling actions: show ONLY top performers
  if (action.type === 'increase_budget' || action.type === 'duplicate') {
    relevantData = [
      ...demographics.filter(d => d.roas > avgRoas * 1.5),
      ...geographic.filter(g => g.roas > avgRoas * 1.5),
      ...placements.filter(p => p.roas > avgRoas * 1.5),
      ...temporal.filter(t => t.roas > avgRoas * 1.5)
    ];
  }

  // Protective actions: show ONLY underperformers
  if (action.type === 'decrease_budget' || action.type === 'pause') {
    relevantData = [
      ...demographics.filter(d => d.roas < avgRoas),
      ...geographic.filter(g => g.roas < avgRoas),
      ...placements.filter(p => p.roas < avgRoas),
      ...temporal.filter(t => t.roas < avgRoas)
    ];
  }

  // Sort by deviation from average (most extreme first)
  return relevantData
    .sort((a, b) => Math.abs(b.roas - avgRoas) - Math.abs(a.roas - avgRoas))
    .slice(0, 6); // Show top 6 most relevant
};
```

## Benefits

1. **Transparent AI Logic** - Users see exactly why the AI made each suggestion
2. **Data Validation** - Click any suggestion to verify it with real data
3. **Confidence Building** - "The AI analyzed this specific data and found these patterns"
4. **Reduced Cognitive Load** - See suggestion first, then validate with data
5. **Clear IF/THEN Rules** - No vague descriptions, exact trigger conditions
6. **Focused View** - Only see data relevant to what you're considering

## Removed Elements

- ❌ Generic "What you should do" heading
- ❌ Vague rule descriptions
- ❌ Showing all data cards upfront
- ❌ Green color from scaling rules
- ❌ Expandable cards with unrelated data
- ❌ "Top performing segments" in action cards (moved to filters)

## New User Flow

1. User opens modal in Expert view
2. Sees 2-3 AI suggestions at top
3. Clicks first suggestion
4. Data cards below filter to show ONLY the segments that triggered this
5. User validates: "Yes, these segments are performing well"
6. Clicks "Execute Action" with confidence
7. Or clicks Automation Rule to see trigger conditions
8. Data filters to show segments that would trigger the rule
9. User enables rule knowing exactly when it activates

## Key Principle

**"Show me what you found, then let me verify it"** rather than **"Here's all the data, figure out what I'm suggesting"**
