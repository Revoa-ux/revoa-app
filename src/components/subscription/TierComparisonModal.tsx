import React from 'react';
import { X, Check, TrendingUp } from 'lucide-react';
import { pricingTiers } from '@/components/pricing/PricingTiers';
import type { PricingTier } from '@/types/pricing';
import { calculateUpgradeCost } from '@/lib/subscriptionService';

interface TierComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: PricingTier['id'];
  currentOrderCount: number;
  shopDomain: string;
}

export function TierComparisonModal({
  isOpen,
  onClose,
  currentTier,
  currentOrderCount,
  shopDomain,
}: TierComparisonModalProps) {
  if (!isOpen) return null;

  const handleUpgrade = (tierId: PricingTier['id']) => {
    // Redirect to Shopify-hosted pricing page
    const appHandle = import.meta.env.VITE_SHOPIFY_API_KEY || 'revoa';
    const storeName = shopDomain.replace('.myshopify.com', '');
    const pricingUrl = `https://admin.shopify.com/store/${storeName}/charges/${appHandle}/pricing_plans`;

    window.open(pricingUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-dark rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#333333]">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Choose Your Plan
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              You're currently processing {currentOrderCount.toLocaleString()} orders/month
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost p-2"
          >
            <X className="btn-icon w-5 h-5" />
          </button>
        </div>

        {/* Pricing Tiers */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingTiers.map((tier) => {
              const isCurrentTier = tier.id === currentTier;
              const tierIndex = pricingTiers.findIndex(t => t.id === tier.id);
              const currentTierIndex = pricingTiers.findIndex(t => t.id === currentTier);
              const isUpgrade = tierIndex > currentTierIndex;
              const isDowngrade = tierIndex < currentTierIndex;
              const upgradeCost = isUpgrade ? calculateUpgradeCost(currentTier, tier.id) : 0;
              const isRecommended = currentOrderCount >= tier.orderMin && currentOrderCount <= tier.orderMax;

              return (
                <div
                  key={tier.id}
                  className={`relative rounded-xl border-2 transition-all duration-300 ${
                    isCurrentTier
                      ? 'border-red-500 ring-2 ring-red-500/20 shadow-lg'
                      : isRecommended
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg'
                      : 'border-gray-200 dark:border-[#333333] hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {/* Current Tier Badge */}
                  {isCurrentTier && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                        Current Plan
                      </span>
                    </div>
                  )}

                  {/* Recommended Badge */}
                  {!isCurrentTier && isRecommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                        Recommended
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    {/* Tier Name */}
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {tier.name}
                    </h3>

                    {/* Order Limit */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {tier.orderLimit}
                    </p>

                    {/* Pricing */}
                    <div className="mb-6">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        ${tier.monthlyFee}
                        <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/mo</span>
                      </div>
                      {isUpgrade && upgradeCost > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          +${upgradeCost}/month from current plan
                        </p>
                      )}
                      {tier.trialDays && !isCurrentTier && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                          {tier.trialDays}-day free trial
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-6">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Action Button */}
                    {isCurrentTier ? (
                      <button
                        disabled
                        className="btn btn-secondary w-full cursor-not-allowed opacity-60"
                      >
                        Current Plan
                      </button>
                    ) : isUpgrade ? (
                      <button
                        onClick={() => handleUpgrade(tier.id)}
                        className="btn btn-danger w-full"
                      >
                        <TrendingUp className="btn-icon w-4 h-4" />
                        Upgrade
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(tier.id)}
                        className="btn btn-secondary w-full"
                      >
                        Downgrade
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info Footer */}
          <div className="mt-8 p-4 rounded-lg bg-gray-50 dark:bg-dark/50 border border-gray-200 dark:border-[#333333]">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              All plans include 0% commission on sales. Billing is handled securely through Shopify.
              You can upgrade or downgrade anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
