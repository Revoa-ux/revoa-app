import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Repeat } from 'lucide-react';
import Modal from '@/components/Modal';
import { QuoteBuilderModeSelector } from '@/components/quotes/QuoteBuilderModeSelector';
import { GuidedModeStep1 } from '@/components/quotes/GuidedModeStep1';
import { GuidedModeStep2 } from '@/components/quotes/GuidedModeStep2';
import { GuidedModeStep3 } from '@/components/quotes/GuidedModeStep3';
import { GuidedModeStep4 } from '@/components/quotes/GuidedModeStep4';
import { QuickModeBulkEditor } from '@/components/quotes/QuickModeBulkEditor';
import { NewQuoteVariant, VariantType, QuoteVariant, FinalVariant } from '@/types/quotes';
import { toast } from 'sonner';

interface Quote {
  id: string;
  productUrl: string;
  productName: string;
  shopifyProductId?: string;
  shopDomain?: string;
}

interface NewProcessQuoteModalProps {
  quote: Quote;
  onClose: () => void;
  onSubmit: (variants: QuoteVariant[]) => void;
}

export const NewProcessQuoteModal: React.FC<NewProcessQuoteModalProps> = ({
  quote,
  onClose,
  onSubmit
}) => {
  const [mode, setMode] = useState<'guided' | 'quick' | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [hasVariants, setHasVariants] = useState(false);
  const [variantTypes, setVariantTypes] = useState<VariantType[]>([]);
  const [selectedCombinations, setSelectedCombinations] = useState<Set<string>>(new Set());
  const [combinationAttributes, setCombinationAttributes] = useState<Map<string, any[]>>(new Map());
  const [variants, setVariants] = useState<NewQuoteVariant[]>([]);

  useEffect(() => {
    if (mode === 'guided' && hasVariants && selectedCombinations.size > 0 && variants.length === 0) {
      const newVariants: NewQuoteVariant[] = [];
      combinationAttributes.forEach((attributes, key) => {
        const name = attributes.map(a => a.value).join(' - ');
        newVariants.push({
          id: `var_${Date.now()}_${key}`,
          sku: '',
          name,
          attributes,
          costPerItem: 0,
          shippingRules: {
            default: 0,
            byCountry: {},
            byQuantity: undefined
          },
          enabled: true
        });
      });
      setVariants(newVariants);
    } else if (mode === 'guided' && !hasVariants && variants.length === 0) {
      setVariants([{
        id: `var_${Date.now()}`,
        sku: '',
        name: quote.productName,
        attributes: [],
        costPerItem: 0,
        shippingRules: {
          default: 0,
          byCountry: {},
          byQuantity: undefined
        },
        enabled: true
      }]);
    }
  }, [mode, hasVariants, selectedCombinations, combinationAttributes, variants.length, quote.productName]);

  const canProceedFromStep1 = !hasVariants || (selectedCombinations.size > 0);
  const canProceedFromStep2 = variants.every(v => v.sku.trim() && v.costPerItem > 0);
  const canProceedFromStep3 = variants.every(v => v.shippingRules.default >= 0);
  const canSubmit = canProceedFromStep2 && canProceedFromStep3;

  const handleNext = () => {
    if (currentStep === 1 && !canProceedFromStep1) {
      toast.error('Please select at least one variant combination');
      return;
    }
    if (currentStep === 2 && !canProceedFromStep2) {
      toast.error('Please complete SKU and pricing for all variants');
      return;
    }
    if (currentStep === 3 && !canProceedFromStep3) {
      toast.error('Please set shipping costs for all variants');
      return;
    }
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleSwitchMode = () => {
    setMode(null);
  };

  const convertToLegacyFormat = (): QuoteVariant[] => {
    return variants.map(variant => {
      const finalVariant: FinalVariant = {
        sku: variant.sku,
        attributes: variant.attributes,
        costPerItem: variant.costPerItem,
        shippingCosts: {
          _default: variant.shippingRules.default,
          ...variant.shippingRules.byCountry
        }
      };

      return {
        packSize: 1,
        skuPrefix: variant.sku,
        finalVariants: [finalVariant]
      };
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error('Please complete all required fields');
      return;
    }

    const legacyVariants = convertToLegacyFormat();
    onSubmit(legacyVariants);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={mode ? "Process Quote Request" : "Choose Setup Method"}
      maxWidth="max-w-6xl"
    >
      <div className="space-y-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {quote.productName}
              </p>
              <a
                href={
                  quote.shopifyProductId && quote.shopDomain
                    ? `https://${quote.shopDomain}/admin/products/${quote.shopifyProductId}`
                    : quote.productUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
              >
                View Product →
              </a>
            </div>
            {mode && (
              <button
                type="button"
                onClick={handleSwitchMode}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center space-x-1"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Switch Mode</span>
              </button>
            )}
          </div>
        </div>

        {!mode ? (
          <QuoteBuilderModeSelector onModeSelect={(selectedMode) => {
            setMode(selectedMode);
            if (selectedMode === 'quick' && variants.length === 0) {
              setVariants([{
                id: `var_${Date.now()}`,
                sku: '',
                name: quote.productName,
                attributes: [],
                costPerItem: 0,
                shippingRules: {
                  default: 0,
                  byCountry: {},
                  byQuantity: undefined
                },
                enabled: true
              }]);
            }
          }} />
        ) : mode === 'guided' ? (
          <>
            <div className="flex items-center justify-center space-x-2 mb-6">
              {[1, 2, 3, 4].map((step) => (
                <React.Fragment key={step}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(step)}
                    disabled={step > currentStep}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                      ${currentStep === step
                        ? 'bg-rose-600 text-white'
                        : currentStep > step
                        ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {step}
                  </button>
                  {step < 4 && (
                    <div className={`w-12 h-0.5 ${currentStep > step ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {currentStep === 1 && (
              <GuidedModeStep1
                hasVariants={hasVariants}
                variantTypes={variantTypes}
                onHasVariantsChange={setHasVariants}
                onVariantTypesChange={setVariantTypes}
                selectedCombinations={selectedCombinations}
                onSelectedCombinationsChange={setSelectedCombinations}
                combinationAttributes={combinationAttributes}
                onCombinationAttributesChange={setCombinationAttributes}
              />
            )}

            {currentStep === 2 && (
              <GuidedModeStep2
                variants={variants}
                onVariantsChange={setVariants}
              />
            )}

            {currentStep === 3 && (
              <GuidedModeStep3
                variants={variants}
                onVariantsChange={setVariants}
              />
            )}

            {currentStep === 4 && (
              <GuidedModeStep4
                variants={variants}
                onEdit={setCurrentStep}
              />
            )}
          </>
        ) : (
          <QuickModeBulkEditor
            variants={variants}
            onVariantsChange={setVariants}
          />
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-2">
            {mode === 'guided' && currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            {mode === 'guided' && currentStep < 4 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center space-x-1"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : mode ? (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-6 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                Submit Quote
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
};
