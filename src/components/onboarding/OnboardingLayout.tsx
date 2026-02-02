import React from 'react';
import { OnboardingStep } from '../../pages/Onboarding';
import {
  Store,
  BarChart3,
  Package,
  ArrowLeft,
  ArrowRight,
  Check,
  Settings,
  LucideIcon
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

interface StepStyle {
  bg: string;
  glow: string;
  border: string;
  text: string;
  insetShadow: string;
}

const STEP_STYLES: Record<string, StepStyle> = {
  store: {
    bg: '#E11D48',
    glow: 'rgba(225, 29, 72, 0.15)',
    border: 'rgba(254, 202, 202, 0.7)',
    text: '#be3a34',
    insetShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)',
  },
  ads: {
    bg: '#EC4899',
    glow: 'rgba(236, 72, 153, 0.15)',
    border: 'rgba(251, 207, 232, 0.7)',
    text: '#9d174d',
    insetShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)',
  },
  products: {
    bg: '#F97316',
    glow: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(253, 186, 116, 0.7)',
    text: '#c2410c',
    insetShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)',
  },
  complete: {
    bg: '#10B981',
    glow: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(167, 243, 208, 0.7)',
    text: '#047857',
    insetShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)',
  },
};

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
  const steps: { id: OnboardingStep; label: string; Icon: LucideIcon }[] = [
    { id: 'store', label: 'Store', Icon: Store },
    { id: 'ads', label: 'Ads', Icon: BarChart3 },
    { id: 'products', label: 'Products', Icon: Package },
    { id: 'complete', label: 'Setup', Icon: Settings }
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#171717] flex flex-col relative overflow-hidden">
      {/* Dotted grid background with soft fade */}
      <div className="absolute inset-0 flex justify-center pointer-events-none">
        <div
          className="w-full max-w-[1280px] dark:opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle, #d4d4d4 0.75px, transparent 0.75px)`,
            backgroundSize: '14px 14px',
            maskImage: 'radial-gradient(ellipse 70% 55% at 50% 48%, black 0%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 55% at 50% 48%, black 0%, transparent 100%)'
          }}
        />
      </div>

      {/* Progress bar and step indicators */}
      <div className="w-full flex justify-center mt-8 mb-12 px-4 relative z-10">
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
                const stepStyle = STEP_STYLES[step.id];
                const StepIcon = step.Icon;

                return (
                  <div
                    key={step.id}
                    className="flex flex-col items-center z-10 relative"
                  >
                    {isActive || isCompleted ? (
                      <div
                        className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm mb-2 transition-all duration-300"
                        style={{ backgroundColor: stepStyle.glow }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: stepStyle.bg,
                            boxShadow: stepStyle.insetShadow,
                          }}
                        >
                          {isCompleted && !isActive ? (
                            <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                          ) : (
                            <StepIcon className="w-4 h-4 text-white" strokeWidth={2} />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm mb-2 transition-all duration-300 bg-gray-100 dark:bg-[#2a2a2a]">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#3a3a3a]">
                          <StepIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" strokeWidth={2} />
                        </div>
                      </div>
                    )}
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
              <div className="relative w-full h-0.5 bg-gray-200 dark:bg-[#3a3a3a] rounded-full">
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
      <main className="flex-1 flex flex-col pb-24 relative z-10">
        <div className="max-w-[700px] mx-auto px-4 flex-1">
          {/* Content wrapper */}
          <div className="bg-gray-50/80 dark:bg-[#1f1f1f]/80 p-8 rounded-xl">
            {children}
          </div>
        </div>
      </main>

      {/* Navigation buttons - sticky at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1f1f1f] border-t border-gray-200 dark:border-[#2a2a2a] shadow-lg z-50">
        <div className="max-w-[700px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onPrevious}
              className={`btn btn-secondary group flex items-center ${
                currentStep === 'store'
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
              disabled={currentStep === 'store'}
            >
              <ArrowLeft className="btn-icon transition-transform duration-200 group-hover:-translate-x-0.5" />
              Previous
            </button>

            <button
              onClick={onNext}
              disabled={!canGoNext}
              className={`group flex items-center ${
                !canGoNext
                  ? 'btn btn-secondary opacity-50 cursor-not-allowed'
                  : shouldShowSkip()
                  ? 'btn btn-secondary'
                  : 'btn btn-primary'
              }`}
            >
              {currentStep === 'complete' ? 'Finish' : (shouldShowSkip() ? 'Skip' : 'Next')}
              <ArrowRight className="btn-icon btn-icon-arrow" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingLayout;