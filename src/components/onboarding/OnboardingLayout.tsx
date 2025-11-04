import React from 'react';
import { OnboardingStep } from '../../pages/Onboarding';
import {
  Store,
  BarChart3,
  Package,
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles
} from 'lucide-react';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: OnboardingStep;
  progress: number;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  adPlatforms?: string[];
  productSetupComplete?: boolean;
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  currentStep,
  progress,
  onNext,
  onPrevious,
  canGoNext,
  adPlatforms = [],
  productSetupComplete = false
}) => {
  const steps: { id: OnboardingStep; label: string; icon: React.ReactNode }[] = [
    { id: 'store', label: 'Store', icon: <Store className="w-4 h-4" /> },
    { id: 'ads', label: 'Ads', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
    { id: 'complete', label: 'Complete', icon: <Sparkles className="w-4 h-4" /> }
  ];

  // Determine if the current step should show "Skip" instead of "Next"
  const shouldShowSkip = () => {
    if (currentStep === 'ads' && adPlatforms.length === 0) return true;
    if (currentStep === 'products' && !productSetupComplete) return true;
    return false;
  };

  // Calculate progress bar width based on current step
  const getProgressWidth = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    const percentage = (stepIndex / (steps.length - 1)) * 100;
    return `${percentage}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Progress bar and step indicators */}
      <div className="w-full flex justify-center mt-8 mb-12 px-4">
        <div className="w-full max-w-[700px]">
          {/* Step indicators container */}
          <div className="relative">
            {/* Step indicators */}
            <div className="relative flex justify-between items-start">
              {steps.map((step, index) => {
                const isActive = currentStep === step.id;
                const isCompleted =
                  (step.id === 'store' && ['ads', 'products', 'complete'].includes(currentStep)) ||
                  (step.id === 'ads' && ['products', 'complete'].includes(currentStep)) ||
                  (step.id === 'products' && ['complete'].includes(currentStep));

                return (
                  <div
                    key={step.id}
                    className="flex flex-col items-center z-10 relative"
                  >
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full mb-2 transition-all duration-300 ${
                        isActive || isCompleted
                          ? 'bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] text-white shadow-lg'
                          : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {isCompleted && !isActive ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium whitespace-nowrap transition-colors ${
                        isActive || isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Progress bar line positioned absolutely behind icons */}
            <div className="absolute left-0 right-0 top-5 -z-10 flex items-center px-5">
              <div className="relative w-full h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                {/* Animated gradient progress bar */}
                <div
                  className="absolute left-0 top-0 h-0.5 rounded-full transition-all duration-500 ease-in-out overflow-hidden"
                  style={{ width: getProgressWidth() }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,#E11D48_0%,#EC4899_50%,#E8795A_100%)] animate-gradient" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <main className="flex-1 flex flex-col pb-24">
        <div className="max-w-[700px] mx-auto px-4 flex-1">
          {/* Content wrapper */}
          <div className="bg-gray-50/80 dark:bg-gray-900/80 p-8 rounded-xl">
            {children}
          </div>
        </div>
      </main>

      {/* Navigation buttons - sticky at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
        <div className="max-w-[700px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onPrevious}
              className={`group flex items-center px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                currentStep === 'store'
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600'
              }`}
              disabled={currentStep === 'store'}
            >
              <ArrowLeft className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:-translate-x-0.5" />
              Previous
            </button>

            <button
              onClick={onNext}
              disabled={!canGoNext}
              className={`group flex items-center px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                canGoNext
                  ? 'bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] text-white hover:opacity-90 shadow-md'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {currentStep === 'complete' ? 'Finish' : (shouldShowSkip() ? 'Skip' : 'Next')}
              <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingLayout;