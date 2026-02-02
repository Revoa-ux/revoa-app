import React from 'react';
import { X, Brain, TrendingUp, Shield, Zap, BarChart3, Check } from 'lucide-react';

interface RexIntroductionModalProps {
  onClose: () => void;
  onGetStarted: () => void;
}

export const RexIntroductionModal: React.FC<RexIntroductionModalProps> = ({
  onClose,
  onGetStarted
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 text-white relative">
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors absolute top-4 right-4"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Meet Rex</h2>
              <p className="text-blue-100">Your AI Performance Analyst</p>
            </div>
          </div>
          <p className="text-lg text-blue-50">
            Rex analyzes thousands of data points across every dimension of your ad campaigns to discover hidden optimization opportunities you'd never find manually.
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6">
          {/* What Rex Does */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              What Rex Does
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Deep Analysis</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Analyzes demographics, placements, geographic, temporal patterns, customer behavior, UTM tracking, device performance, and product margins
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Transparent Projections</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Shows exact revenue, profit, and customer projections with methodology and confidence intervals—no black box AI
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Direct Actions</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      One-click budget changes, pausing, duplication, and targeting adjustments—no need to switch platforms
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Automated Safeguards</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Every insight comes with a recommended automation rule to protect your wins and prevent future losses
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Example Insight */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Example: Real AI Analysis
            </h3>
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-[#171717] dark:to-blue-900/20 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-800">
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium text-gray-900 dark:text-white">
                  "Your Women 25-34 demographic is delivering 8.2x ROAS—4x better than your 2.1x average. They represent 23% of spend but 47% of revenue."
                </p>
                <p>
                  "This pattern emerged from 14,287 conversions across 127 demographic segments. These customers have a 43% repeat rate with $87 lifetime value, indicating high long-term value. Most conversions occur Tuesday-Thursday 7-9PM on Instagram Stories (Mobile)."
                </p>
                <p>
                  "If you scale this segment by 150% while maintaining performance: <span className="font-semibold text-green-600 dark:text-green-400">+$12,400 revenue, +$5,890 profit, +487 customers monthly</span>. If ignored: <span className="font-semibold text-red-600 dark:text-red-400">-$3,200 wasted spend on underperformers</span>."
                </p>
              </div>
            </div>
          </div>

          {/* What Makes Rex Different */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              What Makes Rex Different
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Real data analysis</span> — Every insight is backed by actual conversions, customer behavior, and margin data
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Full transparency</span> — See exactly what data was analyzed, methodology used, and confidence levels
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Context-rich insights</span> — Multi-paragraph analysis explaining WHAT, WHY, and HOW
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Actionable recommendations</span> — Direct action buttons AND automated rules for every insight
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="py-4 border-t border-gray-200 dark:border-[#333333]">
            <button
              onClick={onGetStarted}
              className="btn btn-primary w-full"
            >
              Start Discovering Insights
            </button>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
              Rex runs continuously in the background, analyzing your campaigns 24/7
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
