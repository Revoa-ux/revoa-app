import { AlertCircle, CheckCircle2, Clock, FileText, Lightbulb } from 'lucide-react';

interface FlowGuidancePanelProps {
  resolution: 'free_replacement' | 'factory_review' | 'not_covered' | 'manual_review';
  reasoning: string;
  nextSteps: string[];
  urgency: 'immediate' | 'within_24h' | 'within_48h' | 'low_priority';
  confidence: 'high' | 'medium' | 'low';
}

export function FlowGuidancePanel({
  resolution,
  reasoning,
  nextSteps,
  urgency,
  confidence,
}: FlowGuidancePanelProps) {
  const urgencyConfig = {
    immediate: { emoji: '🔴', label: 'Immediate Action Required', color: 'red' as const },
    within_24h: { emoji: '🟡', label: 'Respond Within 24 Hours', color: 'yellow' as const },
    within_48h: { emoji: '🟢', label: 'Respond Within 48 Hours', color: 'green' as const },
    low_priority: { emoji: '⚪', label: 'Low Priority', color: 'gray' as const },
  };

  const resolutionConfig = {
    free_replacement: { icon: CheckCircle2, label: 'Free Replacement', color: 'green' as const },
    factory_review: { icon: Clock, label: 'Factory Review Required', color: 'yellow' as const },
    not_covered: { icon: AlertCircle, label: 'Not Covered', color: 'red' as const },
    manual_review: { icon: FileText, label: 'Manual Review', color: 'gray' as const },
  };

  const ResolutionIcon = resolutionConfig[resolution].icon;
  const urgencyInfo = urgencyConfig[urgency];
  const resolutionInfo = resolutionConfig[resolution];

  const getColorClasses = (color: string, type: 'bg' | 'text' | 'border') => {
    const colors = {
      green: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-900 dark:text-green-100',
        border: 'border-green-200 dark:border-green-800',
      },
      yellow: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        text: 'text-yellow-900 dark:text-yellow-100',
        border: 'border-yellow-200 dark:border-yellow-800',
      },
      red: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-900 dark:text-red-100',
        border: 'border-red-200 dark:border-red-800',
      },
      gray: {
        bg: 'bg-gray-50 dark:bg-dark',
        text: 'text-gray-900 dark:text-gray-100',
        border: 'border-gray-200 dark:border-[#3a3a3a]',
      },
    };

    return colors[color as keyof typeof colors]?.[type] || colors.gray[type];
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Resolution Type */}
      <div className={`rounded-lg border p-3 ${getColorClasses(resolutionInfo.color, 'bg')} ${getColorClasses(resolutionInfo.color, 'border')}`}>
        <div className="flex items-center gap-2">
          <ResolutionIcon className={`w-5 h-5 flex-shrink-0 ${getColorClasses(resolutionInfo.color, 'text')}`} />
          <span className={`font-semibold text-sm ${getColorClasses(resolutionInfo.color, 'text')}`}>
            {resolutionInfo.label}
          </span>
        </div>
      </div>

      {/* Urgency Badge */}
      <div className={`rounded-lg border p-3 ${getColorClasses(urgencyInfo.color, 'bg')} ${getColorClasses(urgencyInfo.color, 'border')}`}>
        <div className="flex items-center gap-2">
          <span className="text-base">{urgencyInfo.emoji}</span>
          <span className={`font-medium text-xs ${getColorClasses(urgencyInfo.color, 'text')}`}>
            {urgencyInfo.label}
          </span>
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="rounded-lg border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark p-3">
        <div className="flex items-start gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              AI Analysis
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {reasoning}
            </p>
          </div>
        </div>
        {confidence === 'high' && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>High Confidence</span>
          </div>
        )}
        {confidence === 'medium' && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            <span>Medium Confidence</span>
          </div>
        )}
        {confidence === 'low' && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#3a3a3a] text-gray-700 dark:text-gray-300 text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            <span>Low Confidence - Manual Review Recommended</span>
          </div>
        )}
      </div>

      {/* Next Steps */}
      {nextSteps.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark p-3">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Next Steps:
          </div>
          <ol className="space-y-1.5">
            {nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#3a3a3a] text-gray-700 dark:text-gray-300 font-medium text-[10px]">
                  {index + 1}
                </span>
                <span className="flex-1 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
