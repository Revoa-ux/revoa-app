import { useState, useEffect } from 'react';
import { Check, Zap, TrendingUp, AlertCircle, Info, Loader2 } from 'lucide-react';
import type { DemographicBreakdown, GeographicBreakdown, PlacementBreakdown, TemporalBreakdown } from '@/types/rex';
import { createBidStrategyEligibilityService, type BidStrategyEligibility } from '@/lib/bidStrategyEligibilityService';
import { useAuth } from '@/contexts/AuthContext';

interface SegmentBuilderProps {
  entityType: 'campaign' | 'ad_set';
  entityId: string;
  entityName: string;
  platform: 'facebook' | 'google' | 'tiktok';
  demographicData?: DemographicBreakdown;
  geographicData?: GeographicBreakdown;
  placementData?: PlacementBreakdown;
  temporalData?: TemporalBreakdown;
  currentBudget?: number;
  currentCountries?: string[];
  onBuild: (config: BuildConfiguration) => Promise<void>;
}

export interface SelectedSegment {
  type: 'demographic' | 'geographic' | 'placement' | 'temporal';
  data: any;
}

export interface BuildConfiguration {
  buildType: 'new_campaign' | 'add_to_campaign';
  selectedSegments: SelectedSegment[];
  bidStrategy: string;
  bidAmount?: number;
  budget: number;
  createWideOpen: boolean;
  pauseSource: boolean;
  includedAdIds?: string[];
}

export default function SegmentBuilder({
  entityType,
  entityId,
  entityName,
  platform,
  demographicData,
  geographicData,
  placementData,
  temporalData,
  currentBudget = 0,
  currentCountries = [],
  onBuild
}: SegmentBuilderProps) {
  const { user } = useAuth();
  const [selectedSegments, setSelectedSegments] = useState<SelectedSegment[]>([]);
  const [buildType, setBuildType] = useState<'new_campaign' | 'add_to_campaign'>(
    entityType === 'campaign' ? 'new_campaign' : 'add_to_campaign'
  );
  const [bidStrategyEligibility, setBidStrategyEligibility] = useState<BidStrategyEligibility[]>([]);
  const [selectedBidStrategy, setSelectedBidStrategy] = useState('highest_volume');
  const [bidAmount, setBidAmount] = useState<number | undefined>();
  const [customBudget, setCustomBudget] = useState<number>(currentBudget);
  const [budgetMode, setBudgetMode] = useState<'match' | 'custom' | 'suggested'>('match');
  const [createWideOpen, setCreateWideOpen] = useState(true);
  const [pauseSource, setPauseSource] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);

  // Load bid strategy eligibility on mount
  useEffect(() => {
    if (!user) return;

    const checkEligibility = async () => {
      setIsCheckingEligibility(true);
      const service = createBidStrategyEligibilityService(
        user.id,
        platform,
        entityId,
        entityType
      );
      const eligibility = await service.checkAllEligibility();
      setBidStrategyEligibility(eligibility);
      setIsCheckingEligibility(false);

      // Pre-select the highest priority eligible strategy
      const eligible = eligibility.find(e => e.eligible && e.type !== 'highest_volume');
      if (eligible) {
        setSelectedBidStrategy(eligible.type);
        if (eligible.suggestedValue) {
          setBidAmount(eligible.suggestedValue);
        }
      }
    };

    checkEligibility();
  }, [user, platform, entityId, entityType]);

  // Calculate suggested budget based on segment coverage
  useEffect(() => {
    if (selectedSegments.length === 0 || budgetMode !== 'suggested') return;

    // Estimate audience size reduction based on segments
    let coverageMultiplier = 1.0;

    // Demographics typically narrow audience by 40-60%
    if (selectedSegments.some(s => s.type === 'demographic')) {
      coverageMultiplier *= 0.5;
    }

    // Geographic targeting can reduce by 20-80% depending on specificity
    if (selectedSegments.some(s => s.type === 'geographic')) {
      coverageMultiplier *= 0.6;
    }

    // Placement optimization typically reduces by 30-50%
    if (selectedSegments.some(s => s.type === 'placement')) {
      coverageMultiplier *= 0.65;
    }

    const suggested = Math.round(currentBudget * coverageMultiplier);
    setCustomBudget(Math.max(5, suggested)); // Minimum $5
  }, [selectedSegments, currentBudget, budgetMode]);

  const toggleSegment = (type: SelectedSegment['type'], data: any) => {
    const exists = selectedSegments.find(s => s.type === type && JSON.stringify(s.data) === JSON.stringify(data));

    if (exists) {
      setSelectedSegments(prev => prev.filter(s => !(s.type === type && JSON.stringify(s.data) === JSON.stringify(data))));
    } else {
      setSelectedSegments(prev => [...prev, { type, data }]);
    }
  };

  const isSegmentSelected = (type: SelectedSegment['type'], data: any) => {
    return selectedSegments.some(s => s.type === type && JSON.stringify(s.data) === JSON.stringify(data));
  };

  const handleBuild = async () => {
    if (selectedSegments.length === 0) return;

    setIsLoading(true);
    try {
      const config: BuildConfiguration = {
        buildType,
        selectedSegments,
        bidStrategy: selectedBidStrategy,
        bidAmount,
        budget: budgetMode === 'match' ? currentBudget : customBudget,
        createWideOpen,
        pauseSource: buildType === 'add_to_campaign' && pauseSource
      };

      await onBuild(config);
    } catch (error) {
      console.error('Error building:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedBudget = budgetMode === 'match' ? currentBudget : customBudget;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Segment Builder</h3>
          <p className="text-sm text-gray-500 mt-1">
            Select winning segments to build a new {entityType === 'campaign' ? 'campaign' : 'ad set'} with optimized targeting
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-md w-fit">
            <Zap className="w-3 h-3" />
            <span>Horizontal Scaling Strategy</span>
          </div>
        </div>
      </div>

      {/* Build Type Selection (for ad sets) */}
      {entityType === 'ad_set' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Build Location</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setBuildType('add_to_campaign')}
              className={`p-3 rounded-lg border-2 transition-all ${
                buildType === 'add_to_campaign'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">Add to Current Campaign</div>
              <div className="text-xs text-gray-500 mt-1">Create new ad set alongside existing ones</div>
            </button>
            <button
              onClick={() => setBuildType('new_campaign')}
              className={`p-3 rounded-lg border-2 transition-all ${
                buildType === 'new_campaign'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">Create in New Campaign</div>
              <div className="text-xs text-gray-500 mt-1">Start fresh campaign with this ad set</div>
            </button>
          </div>

          {buildType === 'add_to_campaign' && (
            <label className="flex items-center gap-2 mt-3 text-sm">
              <input
                type="checkbox"
                checked={pauseSource}
                onChange={(e) => setPauseSource(e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-gray-700">Turn off source ad set (budget flows to new one)</span>
            </label>
          )}
        </div>
      )}

      {/* Segment Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Select Winning Segments</h4>
          {selectedSegments.length > 0 && (
            <span className="text-xs text-gray-500">{selectedSegments.length} selected</span>
          )}
        </div>

        {/* Demographics */}
        {demographicData && demographicData.topPerforming.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase">Demographics</div>
            <div className="grid grid-cols-2 gap-2">
              {demographicData.topPerforming.slice(0, 6).map((demo, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleSegment('demographic', demo)}
                  className={`p-3 rounded-lg border transition-all text-left ${
                    isSegmentSelected('demographic', demo)
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {demo.gender === 'male' ? '♂' : '♀'} {demo.ageRange}
                    </span>
                    {isSegmentSelected('demographic', demo) && (
                      <Check className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-600 font-semibold">{demo.roas.toFixed(2)}x ROAS</span>
                    <span className="text-gray-500">{demo.conversions} conv.</span>
                  </div>
                  {demo.improvement > 0 && (
                    <div className="text-xs text-emerald-600 mt-1">+{demo.improvement}% vs avg</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Geographic */}
        {geographicData && geographicData.topPerforming.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase">Geographic</div>
            <div className="grid grid-cols-2 gap-2">
              {geographicData.topPerforming.slice(0, 6).map((geo, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleSegment('geographic', geo)}
                  className={`p-3 rounded-lg border transition-all text-left ${
                    isSegmentSelected('geographic', geo)
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{geo.location}</span>
                    {isSegmentSelected('geographic', geo) && (
                      <Check className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-600 font-semibold">{geo.roas.toFixed(2)}x ROAS</span>
                    <span className="text-gray-500">{geo.conversions} conv.</span>
                  </div>
                  {geo.improvement > 0 && (
                    <div className="text-xs text-emerald-600 mt-1">+{geo.improvement}% vs avg</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Placements */}
        {placementData && placementData.topPerforming.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase">Placements</div>
            <div className="grid grid-cols-2 gap-2">
              {placementData.topPerforming.slice(0, 6).map((placement, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleSegment('placement', placement)}
                  className={`p-3 rounded-lg border transition-all text-left ${
                    isSegmentSelected('placement', placement)
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {placement.platform} - {placement.placementType}
                    </span>
                    {isSegmentSelected('placement', placement) && (
                      <Check className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-600 font-semibold">{placement.roas.toFixed(2)}x ROAS</span>
                    <span className="text-gray-500">{placement.conversions} conv.</span>
                  </div>
                  {placement.improvement > 0 && (
                    <div className="text-xs text-emerald-600 mt-1">+{placement.improvement}% vs avg</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bid Strategy Selection */}
      {selectedSegments.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Bid Strategy</h4>
            {isCheckingEligibility && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking eligibility...
              </span>
            )}
          </div>

          <div className="space-y-2">
            {bidStrategyEligibility.map((strategy) => (
              <button
                key={strategy.type}
                onClick={() => {
                  if (strategy.eligible) {
                    setSelectedBidStrategy(strategy.type);
                    if (strategy.suggestedValue) {
                      setBidAmount(strategy.suggestedValue);
                    }
                  }
                }}
                disabled={!strategy.eligible}
                className={`w-full p-3 rounded-lg border transition-all text-left ${
                  selectedBidStrategy === strategy.type
                    ? 'border-red-500 bg-red-50'
                    : strategy.eligible
                    ? 'border-gray-200 bg-white hover:border-gray-300'
                    : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {strategy.type.replace(/_/g, ' ')}
                      </span>
                      {strategy.eligible && selectedBidStrategy === strategy.type && (
                        <Check className="w-4 h-4 text-red-600" />
                      )}
                      {!strategy.eligible && strategy.daysUntilEligible && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          {strategy.daysUntilEligible}d until eligible
                        </span>
                      )}
                    </div>
                    {strategy.reason && (
                      <p className="text-xs text-gray-600 mt-1">{strategy.reason}</p>
                    )}
                    {strategy.eligible && strategy.suggestedValue && (
                      <p className="text-xs text-emerald-600 font-medium mt-1">
                        Suggested: ${strategy.suggestedValue.toFixed(2)}
                      </p>
                    )}
                  </div>
                  {!strategy.eligible && (
                    <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                  )}
                </div>

                {!strategy.eligible && strategy.requirements && strategy.requirements.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                    {strategy.requirements.map((req, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${req.met ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        <span className={req.met ? 'text-emerald-600' : 'text-gray-500'}>
                          {req.details}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Bid Amount Input */}
          {(selectedBidStrategy === 'cost_per_result_goal' || selectedBidStrategy === 'roas_goal') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {selectedBidStrategy === 'cost_per_result_goal' ? 'Cost Cap' : 'ROAS Goal'}
              </label>
              <input
                type="number"
                value={bidAmount || ''}
                onChange={(e) => setBidAmount(parseFloat(e.target.value))}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder={`Enter ${selectedBidStrategy === 'cost_per_result_goal' ? 'cost cap' : 'ROAS goal'}`}
              />
            </div>
          )}
        </div>
      )}

      {/* Budget Configuration */}
      {selectedSegments.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Budget</h4>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={budgetMode === 'match'}
                onChange={() => setBudgetMode('match')}
                className="text-red-600 focus:ring-red-500"
              />
              <span className="text-gray-700">Match source budget: ${currentBudget.toFixed(2)}/day</span>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={budgetMode === 'suggested'}
                onChange={() => setBudgetMode('suggested')}
                className="text-red-600 focus:ring-red-500"
              />
              <span className="text-gray-700">Suggested (based on segment size)</span>
              {budgetMode === 'suggested' && (
                <span className="text-emerald-600 font-medium">${customBudget.toFixed(2)}/day</span>
              )}
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={budgetMode === 'custom'}
                onChange={() => setBudgetMode('custom')}
                className="text-red-600 focus:ring-red-500"
              />
              <span className="text-gray-700">Custom budget</span>
            </label>

            {budgetMode === 'custom' && (
              <input
                type="number"
                value={customBudget}
                onChange={(e) => setCustomBudget(parseFloat(e.target.value))}
                step="1"
                min="5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter daily budget"
              />
            )}
          </div>
        </div>
      )}

      {/* Wide Open Option */}
      {selectedSegments.length > 0 && entityType === 'campaign' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={createWideOpen}
              onChange={(e) => setCreateWideOpen(e.target.checked)}
              className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Also create a Wide Open ad set (recommended)
              </div>
              <p className="text-xs text-gray-600">
                {createWideOpen
                  ? 'Creates 1 targeted ad set with your selected segments + 1 broad ad set (country targeting only)'
                  : 'Creates 2 identical targeted ad sets for testing (no broad ad set)'}
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Preview Summary */}
      {selectedSegments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Build Preview</h5>
              <div className="space-y-1 text-sm text-gray-700">
                {buildType === 'new_campaign' ? (
                  <>
                    <div>• Creates new campaign: "{entityName} - Segments"</div>
                    <div>
                      • With {createWideOpen ? '2' : '2'} ad sets:
                      {createWideOpen
                        ? ' (1) Targeted + (1) Wide Open'
                        : ' (1) Targeted + (2) Targeted'}
                    </div>
                  </>
                ) : (
                  <>
                    <div>• Adds new ad set to current campaign</div>
                    {pauseSource && <div>• Pauses source ad set</div>}
                  </>
                )}
                <div>• Targeting: {selectedSegments.map(s => s.type).join(', ')}</div>
                <div>• Bid strategy: {selectedBidStrategy.replace(/_/g, ' ')}</div>
                <div>• Daily budget: ${selectedBudget.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Build Button */}
      <button
        onClick={handleBuild}
        disabled={selectedSegments.length === 0 || isLoading}
        className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg font-medium hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Building...
          </>
        ) : (
          <>
            <TrendingUp className="w-5 h-5" />
            Build {buildType === 'new_campaign' ? 'Campaign' : 'Ad Set'}
          </>
        )}
      </button>
    </div>
  );
}
