# Modal Intelligence Integration Guide

## Current Issue

The Simple, Expert, and Advanced modes in `ComprehensiveRexInsightsModal.tsx` currently show nearly identical content - just variations of the same audience intelligence data (demographics, geographic, placements). This defeats the purpose of having three modes.

## What Each Mode Should Show

### Simple Mode (For Merchants Who Want Quick Decisions)
**Philosophy**: "Tell me what to do in 10 seconds"

**Content**:
1. **Hero Statement** - One sentence: "Your Women 25-34 segment is delivering 4.2x ROAS"
2. **Primary Metric Card** - The #1 winning segment with 3 key numbers
3. **Primary Action Button** - Big, prominent: "Scale Women 25-34 by 30%"
4. **Expected Impact** - "+$5,240 profit in 30 days"

**What to Hide**:
- All other data cards
- Multiple actions
- Campaign structure insights
- Profit breakdowns
- Funnel analysis
- Technical details

**Code Changes Needed**:
```tsx
{viewMode === 'simple' && (
  <>
    {/* Hero statement */}
    <div className="text-center py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {demographics[0]?.segment} is your winner
      </h2>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        Delivering {demographics[0]?.roas.toFixed(1)}x ROAS with {demographics[0]?.conversions} conversions
      </p>
    </div>

    {/* Single primary card */}
    <div className="max-w-md mx-auto">
      <DataCard
        title={demographics[0]?.segment}
        icon={Users}
        highlight={true}
        data={[
          { label: 'ROAS', value: `${demographics[0]?.roas?.toFixed(1)}x` },
          { label: 'Revenue', value: formatCurrency(demographics[0]?.revenue || 0) },
          { label: 'Profit', value: formatCurrency(demographics[0]?.profit || 0) }
        ]}
      />
    </div>

    {/* Single action */}
    <div className="max-w-md mx-auto">
      <button
        onClick={() => handleAction(insight.directActions[0].type, insight.directActions[0].parameters)}
        className="w-full p-6 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl font-bold text-lg shadow-xl transition-all"
      >
        {insight.directActions[0].label}
        <div className="text-sm font-normal mt-2 opacity-90">
          Expected: +{formatCurrency(netGainProfit)} profit
        </div>
      </button>
    </div>
  </>
)}
```

### Expert Mode (For Marketers Who Want Data + Strategy)
**Philosophy**: "Show me the data and let me make informed decisions"

**Content**:
1. **Audience Intelligence** (Current)
   - All demographics with ROAS
   - Geographic breakdown
   - Placement performance
   - Temporal patterns

2. **Campaign Structure Intelligence** (NEW)
   - CBO vs ABO recommendation
   - Learning phase status
   - Bidding strategy performance
   - Account health warnings

3. **Multiple Actions**
   - Top 4 recommended actions with projections
   - Each action shows supporting segments

**What to Add**:
```tsx
{viewMode === 'expert' && (
  <>
    {/* Existing Audience Intelligence sections... */}

    {/* NEW: Campaign Structure Intelligence */}
    <div>
      <SectionHeader
        title="Campaign Structure Insights"
        icon={Settings}
      />

      {campaignStructureInsights && (
        <div className="space-y-4">
          {/* CBO vs ABO Card */}
          {campaignStructureInsights.cboAnalysis.recommendation && (
            <div className="bg-white dark:bg-gray-800 border-2 border-rose-300 rounded-xl p-4">
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                {campaignStructureInsights.cboAnalysis.recommendation === 'cbo'
                  ? '🎯 Switch to Campaign Budget Optimization (CBO)'
                  : '✋ Stick with Ad Set Budget Optimization (ABO)'}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {campaignStructureInsights.cboAnalysis.reasoning}
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">CBO ROAS: </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {campaignStructureInsights.cboAnalysis.cboAverageRoas.toFixed(2)}x
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">ABO ROAS: </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {campaignStructureInsights.cboAnalysis.aboAverageRoas.toFixed(2)}x
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Learning Phase Status */}
          {campaignStructureInsights.learningPhaseAnalysis.campaignsInLearning > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 rounded-xl p-4">
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                ⚠️ {campaignStructureInsights.learningPhaseAnalysis.campaignsInLearning} Campaigns in Learning Phase
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Performance is unstable during learning. Avoid major changes for
                {campaignStructureInsights.learningPhaseAnalysis.averageDaysToExit} more days.
              </p>
            </div>
          )}

          {/* Account Health Warning */}
          {campaignStructureInsights.accountHealthImpact.performanceCorrelation.hasImpact && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 rounded-xl p-4">
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                🚨 Account Health Issue Detected
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {campaignStructureInsights.accountHealthImpact.performanceCorrelation.reasoning}
              </p>
              {campaignStructureInsights.accountHealthImpact.feedbackScore && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-500">Feedback Score: </span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {campaignStructureInsights.accountHealthImpact.feedbackScore}/5
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>

    {/* Existing actions section... */}
  </>
)}
```

### Advanced Mode (For Power Users Who Want Everything)
**Philosophy**: "Give me ALL the intelligence and tools to optimize"

**Content**:
1. **Actions with Inline Automation** (Current Advanced mode actions)
   - Click action to see supporting data
   - "Execute Now" button
   - "Set as Automated Rule" button (NEW)

2. **Campaign Intelligence Dashboard** (NEW)
   - CBO performance chart
   - Learning phase timeline
   - Scaling breakpoint visualization
   - Bidding strategy comparison table

3. **Profit Intelligence** (NEW)
   - Profit ROAS vs Revenue ROAS comparison
   - Margin opportunities by ad
   - Product-level profitability
   - High-margin product recommendations

4. **Full Funnel Analysis** (NEW)
   - Sankey diagram: Impression → Click → View → ATC → Checkout → Purchase
   - Biggest drop-off identification
   - Landing page conversion rates
   - Device performance breakdown

**What to Add**:
```tsx
{viewMode === 'advanced' && (
  <>
    {/* Existing AI Recommendations with inline automation... */}

    {/* NEW: Campaign Intelligence Dashboard */}
    <div>
      <SectionHeader
        title="Campaign Intelligence Dashboard"
        icon={BarChart3}
      />

      {campaignStructureInsights && (
        <div className="grid grid-cols-2 gap-4">
          {/* CBO vs ABO Performance Chart */}
          <div className="bg-white dark:bg-gray-800 border rounded-xl p-4">
            <h5 className="font-semibold mb-3">Campaign Structure Performance</h5>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">CBO Campaigns ({campaignStructureInsights.cboAnalysis.totalCBOCampaigns})</span>
                <span className="font-bold">{campaignStructureInsights.cboAnalysis.cboAverageRoas.toFixed(2)}x ROAS</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-rose-500 to-pink-500 h-2 rounded-full"
                  style={{ width: `${Math.min((campaignStructureInsights.cboAnalysis.cboAverageRoas / 5) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">ABO Campaigns ({campaignStructureInsights.cboAnalysis.totalABOCampaigns})</span>
                <span className="font-bold">{campaignStructureInsights.cboAnalysis.aboAverageRoas.toFixed(2)}x ROAS</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gray-400 h-2 rounded-full"
                  style={{ width: `${Math.min((campaignStructureInsights.cboAnalysis.aboAverageRoas / 5) * 100, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {campaignStructureInsights.cboAnalysis.reasoning}
            </p>
          </div>

          {/* Learning Phase Status */}
          <div className="bg-white dark:bg-gray-800 border rounded-xl p-4">
            <h5 className="font-semibold mb-3">Learning Phase Status</h5>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2">
                <div className="text-2xl font-bold text-yellow-600">
                  {campaignStructureInsights.learningPhaseAnalysis.campaignsInLearning}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">In Learning</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                <div className="text-2xl font-bold text-red-600">
                  {campaignStructureInsights.learningPhaseAnalysis.campaignsLearningLimited}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Limited</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                <div className="text-2xl font-bold text-green-600">
                  {campaignStructureInsights.learningPhaseAnalysis.campaignsExitedLearning}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Exited</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
              <div>Avg. days to exit: {campaignStructureInsights.learningPhaseAnalysis.averageDaysToExit.toFixed(1)}</div>
              <div>Performance lift after exit: +{campaignStructureInsights.learningPhaseAnalysis.performanceImpact.improvement.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* NEW: Profit Intelligence */}
    <div>
      <SectionHeader
        title="Profit Intelligence"
        icon={DollarSign}
        analysis="True profit analysis using Shopify COGS data - not just revenue ROAS"
      />

      {profitReport && (
        <div className="space-y-4">
          {/* Profit vs Revenue ROAS Comparison */}
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-2 border-rose-300 rounded-xl p-5">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Revenue ROAS</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {profitReport.overallMetrics.overallRevenueRoas.toFixed(2)}x
                </div>
                <div className="text-xs text-gray-500 mt-1">What ad platforms show you</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Profit ROAS</div>
                <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                  {profitReport.overallMetrics.overallProfitRoas.toFixed(2)}x
                </div>
                <div className="text-xs text-gray-500 mt-1">What you actually make</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-rose-200 dark:border-rose-800">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                After COGS ({formatPercent(profitReport.overallMetrics.averageMarginPercent)} margin),
                your true profitability is {profitReport.overallMetrics.overallProfitRoas < profitReport.overallMetrics.overallRevenueRoas ? 'lower' : 'higher'} than reported ROAS.
              </div>
            </div>
          </div>

          {/* Margin Opportunities */}
          {profitReport.marginOpportunities.length > 0 && (
            <div>
              <h5 className="font-semibold mb-3">Margin Opportunities</h5>
              <div className="space-y-2">
                {profitReport.marginOpportunities.slice(0, 3).map((opp, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 border rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h6 className="font-bold text-gray-900 dark:text-white">{opp.adName}</h6>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{opp.opportunity}</p>
                      </div>
                      {opp.type !== 'optimal' && (
                        <span className="px-2 py-1 text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded">
                          +{formatCurrency(opp.potentialProfitIncrease)} potential
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {opp.action}
                    </div>
                    <button
                      onClick={() => handleAction('optimize_margin', { adId: opp.adId, suggestion: opp.action })}
                      className="mt-2 text-sm text-rose-600 dark:text-rose-400 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      Apply This Optimization
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product Performance */}
          {profitReport.productPerformance.length > 0 && (
            <div>
              <h5 className="font-semibold mb-3">Product-Level Profitability</h5>
              <div className="grid grid-cols-3 gap-3">
                {profitReport.productPerformance.slice(0, 6).map((product, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 border rounded-lg p-3">
                    <h6 className="font-semibold text-sm text-gray-900 dark:text-white mb-2 truncate">
                      {product.productName}
                    </h6>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Margin:</span>
                        <span className={`font-bold ${product.marginPercent > 40 ? 'text-green-600' : product.marginPercent < 20 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                          {product.marginPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Units:</span>
                        <span className="font-bold text-gray-900 dark:text-white">{product.unitsSold}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Profit:</span>
                        <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(product.profit)}</span>
                      </div>
                    </div>
                    {product.marginPercent > 50 && (
                      <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-semibold">
                        🎯 Promote this more
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>

    {/* NEW: Full Funnel Analysis */}
    <div>
      <SectionHeader
        title="Full Funnel Analysis"
        icon={TrendingDown}
        analysis="Track the complete customer journey and identify where drop-offs occur"
      />

      {funnelAnalysis && (
        <div className="space-y-4">
          {/* Funnel Visualization */}
          <div className="bg-white dark:bg-gray-800 border rounded-xl p-5">
            <div className="space-y-3">
              {funnelAnalysis.funnelStages.map((stage, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                      {stage.stage.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatNumber(stage.count)} ({stage.rate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 relative overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        stage.dropOffRate > 70 ? 'bg-red-500' :
                        stage.dropOffRate > 50 ? 'bg-yellow-500' :
                        'bg-gradient-to-r from-rose-500 to-pink-500'
                      }`}
                      style={{ width: `${stage.rate}%` }}
                    />
                  </div>
                  {stage.dropOffRate > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {stage.dropOffRate.toFixed(1)}% drop-off ({formatNumber(stage.dropOffCount)} lost)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Biggest Drop-Off Alert */}
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 rounded-xl p-4">
            <h5 className="font-bold text-red-600 dark:text-red-400 mb-2">
              🎯 Biggest Drop-Off: {funnelAnalysis.biggestDropOff.stage.replace('_', ' ')}
            </h5>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {funnelAnalysis.biggestDropOff.dropOffRate.toFixed(1)}% of users drop off at this stage
              ({formatNumber(funnelAnalysis.biggestDropOff.lostOpportunities)} lost opportunities)
            </p>
            {funnelAnalysis.recommendations.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mt-3">
                <div className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">Recommendations:</div>
                <ul className="space-y-1">
                  {funnelAnalysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <span className="text-rose-500 mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Overall Conversion Rate */}
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-2 border-rose-300 rounded-xl p-4 text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Overall Conversion Rate</div>
            <div className="text-4xl font-bold text-rose-600 dark:text-rose-400">
              {funnelAnalysis.overallConversionRate.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {funnelAnalysis.overallConversionRate > 3 ? '🎉 Excellent performance!' :
               funnelAnalysis.overallConversionRate > 1 ? '✅ Good performance' :
               '⚠️ Needs optimization'}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Existing advanced mode content... */}
  </>
)}
```

## Implementation Steps

### 1. Add Intelligence Service Imports
```tsx
import { CampaignStructureIntelligenceEngine } from '@/lib/campaignStructureIntelligence';
import { ProfitIntelligenceService } from '@/lib/profitIntelligenceService';
import { FullFunnelAnalysisService } from '@/lib/fullFunnelAnalysisService';
```

### 2. Add State for Intelligence Data
```tsx
const [campaignStructureInsights, setCampaignStructureInsights] = useState<CampaignStructureInsights | null>(null);
const [profitReport, setProfitReport] = useState<ProfitIntelligenceReport | null>(null);
const [funnelAnalysis, setFunnelAnalysis] = useState<AdFunnelAnalysis | null>(null);
const [loadingIntelligence, setLoadingIntelligence] = useState(false);
```

### 3. Fetch Intelligence Data When Modal Opens
```tsx
useEffect(() => {
  if (isOpen && viewMode !== 'simple') {
    fetchIntelligenceData();
  }
}, [isOpen, viewMode]);

const fetchIntelligenceData = async () => {
  setLoadingIntelligence(true);
  try {
    const userId = 'current-user-id'; // Get from auth context
    const adAccountId = 'ad-account-id'; // Get from props or context

    if (viewMode === 'expert' || viewMode === 'advanced') {
      // Fetch campaign structure insights
      const csEngine = new CampaignStructureIntelligenceEngine(userId, adAccountId, platform);
      const csInsights = await csEngine.getCompleteInsights();
      setCampaignStructureInsights(csInsights);
    }

    if (viewMode === 'advanced') {
      // Fetch profit intelligence
      const profitService = new ProfitIntelligenceService(userId);
      const profit = await profitService.generateReport(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      );
      setProfitReport(profit);

      // Fetch funnel analysis
      const funnelService = new FullFunnelAnalysisService(userId);
      const funnel = await funnelService.analyzeAdFunnel(
        insight.entityId, // Assuming insight has entityId
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      );
      setFunnelAnalysis(funnel);
    }
  } catch (error) {
    console.error('Error fetching intelligence data:', error);
  } finally {
    setLoadingIntelligence(false);
  }
};
```

### 4. Add Inline Automation Buttons
For each action in Advanced mode, add logic to determine if it can be automated:

```tsx
const canBeAutomated = (actionType: string) => {
  // Only profit-based actions can be automated
  const automatableActions = ['pause', 'decrease_budget', 'increase_budget'];
  return automatableActions.includes(actionType);
};

// In the action rendering:
{isSelected && (
  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleAction(action.type, action.parameters);
      }}
      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-lg font-semibold"
    >
      Execute Now
    </button>

    {canBeAutomated(action.type) && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCreateRule(); // Opens rule builder with this action pre-filled
        }}
        className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-rose-300 hover:border-rose-400 text-rose-600 dark:text-rose-400 rounded-lg font-semibold flex items-center justify-center gap-2"
      >
        <Zap className="w-4 h-4" />
        Set as Automated Rule
      </button>
    )}
  </div>
)}
```

## Summary of Changes

| Mode | What User Sees | Load Time | Complexity |
|------|----------------|-----------|------------|
| **Simple** | 1 hero statement + 1 card + 1 action | Instant | Beginner |
| **Expert** | Audience data + Campaign structure insights + 4 actions | 1-2 seconds | Intermediate |
| **Advanced** | Everything + Profit analysis + Funnel visualization + Automation builder | 2-3 seconds | Power User |

This creates a truly progressive disclosure system where users can dive as deep as they want into the intelligence.
