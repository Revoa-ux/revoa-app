# Current Status & Next Steps

## ✅ Completed in This Session

### 1. Icon Updated
- Replaced Sparkles icon with actual **Revoa-AI-Bot.png**
- Clean display in modal header

### 2. Dark Mode Border Fixed
- Changed from `dark:border-rose-600` to `dark:border-rose-500`
- Added proper shadow: `shadow-lg shadow-rose-500/20`
- Highlighted cards now properly show gradient borders in dark mode

### 3. State Management Added
- Added `selectedActionIndex` state for action filtering
- Added `showAutomationRule` state for rule filtering
- Ready for filter implementation

### 4. Data Filtering Function Created
- `getRelevantDataForAction(actionIndex)` function implemented
- Automatically filters to show:
  - **Top performers** (ROAS > 1.5x average) for scaling actions
  - **Underperformers** (ROAS < average) for protective actions
- Combines all data types (demographics, geographic, placements, temporal)
- Sorts by deviation from average
- Returns top 6 most relevant segments

### 5. Comprehensive Restructure Plan
- Created detailed plan document (`EXPERT_VIEW_RESTRUCTURE_PLAN.md`)
- Outlines new user flow
- Explains transparent AI logic approach
- Provides implementation blueprints

## 🚧 Remaining Work

The expert view still needs a complete restructuring to implement the plan. Here's what needs to be done:

### Critical Changes Needed

#### 1. Reorder Expert View Layout

Current structure:
```
Hero Statement
└─ Data Cards (demographics, geographic, placements)
   └─ Actions Section
      └─ Automation Rule
```

Needed structure:
```
AI Suggestions (clickable to filter)
└─ Automation Rule (clickable to filter)
   └─ Filtered Data Cards (based on selection)
```

#### 2. Make Actions Filterable/Selectable

Currently actions in expert view are just expandable cards. They need to become:
- **Selector buttons** at the top
- Show visual indicator when selected
- Display "Based on: 3 demographics, 2 placements" summary
- Show "Click to see supporting data" when not selected
- Show "✓ Viewing data below" when selected

#### 3. Implement Filtered Data Display

Currently all data cards show regardless of action. Needs:
- Check if an action or rule is selected
- If not: Show message "Select an action above to see supporting data"
- If yes: Call `getRelevantDataForAction()` and show ONLY those cards
- Add header: "Showing 6 segments that triggered this opportunity"

#### 4. Fix Automation Rule Card

Currently shows vague text. Needs to show:
```
🛡️ Safeguarding Rule (or no emoji for scaling)

IF (Trigger Conditions):
• ROAS drops below 2.1x
• Persists for 3 consecutive days
• Daily spend exceeds $100

THEN (Automated Actions):
• Reduce budget by 30%
• Send notification to you
• Log decision in activity feed
```

Extract these from `insight.recommendedRule.conditions` and `insight.recommendedRule.actions`.

#### 5. Remove Unnecessary Elements

- Remove "Top performing segments" text from action expandable cards
- Remove green gradient from scaling rules (use same rose/pink branding)
- Remove generic descriptions like "identify similar opportunities"

## 📋 Implementation Checklist

### High Priority (Core UX Issues)
- [ ] Move actions section to top of expert view
- [ ] Make actions clickable selectors (not expandable cards)
- [ ] Implement data filtering based on selected action
- [ ] Show "Select action" message when nothing selected
- [ ] Add "Based on X segments" summary to each action

### Medium Priority (Clarity & Trust)
- [ ] Rewrite automation rule to show clear IF/THEN logic
- [ ] Parse rule conditions into bullet points
- [ ] Parse rule actions into bullet points
- [ ] Make rule selectable to filter data
- [ ] Remove vague "similar opportunities" text

### Low Priority (Polish)
- [ ] Remove green color from scaling rules
- [ ] Add "✓ Viewing data" indicator when selected
- [ ] Add count badge showing "6 segments" on filtered view
- [ ] Smooth transitions when switching selections

## 🎯 Recommended Approach

Given the scope, I recommend:

1. **Create new component file**: `ExpertViewFiltered.tsx`
   - Cleaner than editing 900-line file
   - Can be swapped in easily
   - Keep old version as backup

2. **Build in stages**:
   - Stage 1: Actions at top (selector style)
   - Stage 2: Filter logic working
   - Stage 3: Rule IF/THEN display
   - Stage 4: Polish and transitions

3. **Test incrementally**:
   - Test action selection
   - Test data filtering
   - Test rule display
   - Test combined flow

## 💡 Quick Wins Available Now

If you want immediate improvements without full restructure:

### Quick Fix 1: Better Rule Descriptions
Replace generic text with specific IF/THEN format using existing data:

```tsx
<div>
  <strong>IF:</strong> ROAS &lt; {insight.recommendedRule.conditions[0].threshold_value}x
   for {insight.recommendedRule.conditions[0].time_window_days} days
</div>
<div>
  <strong>THEN:</strong> {insight.recommendedRule.actions[0].action_type.replace('_', ' ')}
</div>
```

### Quick Fix 2: Remove Green from Scaling
Change this in automation rule section:
```tsx
// Remove the conditional green gradient
// Use consistent rose/pink for all rules
className="bg-gradient-to-r from-rose-50 to-pink-50"
```

### Quick Fix 3: Add Data Filtering (Without Restructure)
At bottom of current expert view data sections:
```tsx
{selectedActionIndex !== null && (
  <div className="mt-4 p-3 bg-blue-50 rounded">
    ℹ️ Filtered to show only segments relevant to selected action
  </div>
)}
```

## 🔄 Current File State

- **Icon**: ✅ Updated to Revoa-AI-Bot.png
- **Dark mode borders**: ✅ Fixed
- **Filter function**: ✅ Created (not yet used)
- **State variables**: ✅ Added (not yet used)
- **Layout**: ❌ Still needs restructuring
- **Rule descriptions**: ❌ Still vague
- **Data filtering**: ❌ Not implemented in UI

## 📞 Next Session Recommendation

Start fresh with a focused restructure of just the expert view block (lines 295-450 approximately). This section can be rewritten more cleanly than trying to edit piece by piece.

The filtering logic is ready, the state is ready, we just need to reorganize the render order and connect the pieces.

## Summary

**What works**: Icon, dark mode borders, data filtering logic exists
**What's needed**: Complete expert view layout restructure to put actions first and filter data based on selection

The technical foundation is in place. The remaining work is primarily reorganizing the component structure and connecting the filtering logic to the UI.
