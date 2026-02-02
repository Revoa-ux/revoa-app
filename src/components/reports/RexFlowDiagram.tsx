import React from 'react';
import { Database, Search, Lightbulb, Zap, Target, ArrowRight } from 'lucide-react';
import type { GeneratedInsight } from '@/lib/rexInsightGenerator';

interface RexFlowDiagramProps {
  insight: GeneratedInsight;
}

export const RexFlowDiagram: React.FC<RexFlowDiagramProps> = ({ insight }) => {
  const formatCurrency = (value: number) => `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const formatNumber = (value: number) => value.toLocaleString('en-US');

  const netGainRevenue = (insight.reasoning.projections?.ifImplemented?.revenue || 0) - (insight.reasoning.projections?.ifIgnored?.revenue || 0);
  const netGainConversions = (insight.reasoning.projections?.ifImplemented?.conversions || 0) - (insight.reasoning.projections?.ifIgnored?.conversions || 0);

  const nodes = [
    {
      icon: Database,
      title: 'Data Collection',
      description: `Analyzed ${formatNumber(insight.reasoning.dataPointsAnalyzed || 0)} data points`,
      details: [
        'Campaign performance metrics',
        'Demographic breakdowns',
        'Geographic patterns',
        'Temporal trends'
      ],
      color: 'blue'
    },
    {
      icon: Search,
      title: 'Pattern Detection',
      description: 'Identified anomalies and opportunities',
      details: [
        `Found ${insight.confidence}% confidence pattern`,
        'Cross-referenced multiple dimensions',
        'Validated statistical significance',
        'Compared to historical baselines'
      ],
      color: 'purple'
    },
    {
      icon: Lightbulb,
      title: 'Analysis',
      description: insight.primaryInsight.slice(0, 80) + '...',
      details: [
        `Priority: ${insight.priority}/10`,
        `Confidence: ${insight.confidence}%`,
        `ROI potential: High`,
        'Actionable insight generated'
      ],
      color: 'amber'
    },
    {
      icon: Zap,
      title: 'Recommendation',
      description: insight.directActions[0]?.label || 'Take action',
      details: insight.directActions.slice(0, 3).map(a => a.label),
      color: 'rose'
    },
    {
      icon: Target,
      title: 'Expected Outcome',
      description: 'Projected impact of implementation',
      details: [
        `+${formatCurrency(netGainRevenue)} revenue`,
        `+${formatNumber(netGainConversions)} conversions`,
        '30-day projection',
        'Automated monitoring'
      ],
      color: 'green'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
      purple: 'border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300',
      amber: 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
      rose: 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300',
      green: 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="relative py-8">
      <div className="flex items-start justify-between gap-4">
        {nodes.map((node, idx) => (
          <React.Fragment key={idx}>
            {/* Node */}
            <div className="flex-1 min-w-0">
              <div className={`border-2 rounded-xl p-4 ${getColorClasses(node.color)} transition-all hover:shadow-lg`}>
                <div className="flex items-center gap-2 mb-3">
                  <node.icon className="w-5 h-5" />
                  <h4 className="font-semibold text-sm">{node.title}</h4>
                </div>
                <p className="text-xs mb-3 opacity-90 leading-relaxed">
                  {node.description}
                </p>
                <ul className="space-y-1.5">
                  {node.details.map((detail, detailIdx) => (
                    <li key={detailIdx} className="text-xs opacity-75 flex items-start gap-1.5">
                      <span className="mt-1">•</span>
                      <span className="flex-1">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Arrow connector */}
            {idx < nodes.length - 1 && (
              <div className="flex items-center justify-center pt-12">
                <ArrowRight className="w-6 h-6 text-gray-400 dark:text-gray-600 flex-shrink-0" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Timeline indicator */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-[#3a3a3a]">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Rex's analytical process</span>
          <span>•</span>
          <span>Real-time analysis</span>
          <span>•</span>
          <span>Continuous monitoring</span>
        </div>
      </div>
    </div>
  );
};
