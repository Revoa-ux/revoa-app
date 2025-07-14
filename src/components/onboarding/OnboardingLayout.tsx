import React from 'react';
import { OnboardingStep } from '../../pages/Onboarding';
import { 
  Store, 
  BarChart3, 
  Package, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight,
  Check 
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
  adPlatforms = [], // eslint-disable-line @typescript-eslint/no-unused-vars
  productSetupComplete = false // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const steps: { id: OnboardingStep; label: string; icon: React.ReactNode }[] = [
    { id: 'store', label: 'Store Integration', icon: <Store className="w-4 h-4" /> },
    { id: 'ads', label: 'Ad Platforms', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'products', label: 'Product Setup', icon: <Package className="w-4 h-4" /> },
    { id: 'complete', label: 'Complete', icon: <CheckCircle className="w-4 h-4" /> }
  ];

  // Determine if the current step should show "Skip" instead of "Next"
  const shouldShowSkip = () => {
    if (currentStep === 'ads' && adPlatforms.length === 0) return true;
    if (currentStep === 'products' && !productSetupComplete) return true;
    return false;
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Progress bar and step indicators */}
      <div className="w-full flex justify-center mt-8 mb-8 px-4">
        <div className="w-full max-w-[700px]">
          {/* Progress bar container */}
          <div className="relative w-full h-1.5 bg-gray-200 rounded-full">
            {/* Progress bar line */} {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
            <div 
              className="absolute left-0 top-0 h-1.5 bg-gray-900 rounded-full transition-all duration-500 ease-in-out" 
              style={{ width: getProgressWidth() }}
            />
            
            {/* Step indicators */}
            <div className="absolute -top-2 left-0 right-0 flex justify-between">
              {steps.map((step, index) => {
                const position = index * (100 / (steps.length - 1));
                const isActive = currentStep === step.id;
                const isCompleted = 
                  (step.id === 'store' && ['ads', 'products', 'complete'].includes(currentStep)) ||
                  (step.id === 'ads' && ['products', 'complete'].includes(currentStep)) ||
                  (step.id === 'products' && currentStep === 'complete') ||
                  (step.id === 'complete' && currentStep === 'complete');
                
                return (
                  <div 
                    key={step.id}
                    className="absolute flex flex-col items-center transform -translate-x-1/2"
                    style={{ left: `${position}%` }}
                  >
                    <div 
                      className={`flex items-center justify-center w-8 h-8 rounded-full mb-1.5 transition-colors ${
                        isActive || isCompleted
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <span 
                      className={`text-xs font-medium whitespace-nowrap transition-colors ${
                        isActive || isCompleted ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <div className="max-w-[700px] mx-auto px-4 flex-1">
          {/* Content wrapper */}
          <div className="bg-gray-50/80 p-8 rounded-xl">
            {children}
          </div>
        </div>
          
        {/* Navigation buttons - fixed at the bottom */}
        <div className="mt-auto mb-6">
          <div className="max-w-[700px] mx-auto px-4">
            <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={onPrevious}
                className={`group flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                  currentStep === 'store' 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-100 bg-white'
                }`}
                disabled={currentStep === 'store'}
              >
                <ArrowLeft className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:-translate-x-0.5" />
                Previous
              </button>
              
              <button
                onClick={onNext}
                disabled={!canGoNext}
                className={`group flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                  canGoNext
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {currentStep === 'complete' ? 'Finish' : shouldShowSkip() ? 'Skip' : 'Next'}
                <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OnboardingLayout;