import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StoreIntegration from '../components/onboarding/StoreIntegration';
import AdPlatformIntegration from '../components/onboarding/AdPlatformIntegration';
import ProductSetup from '../components/onboarding/ProductSetup';
import Completion from '../components/onboarding/Completion';
import OnboardingLayout from '../components/onboarding/OnboardingLayout';

export type OnboardingStep = 'store' | 'ads' | 'products' | 'complete';

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('store');
  const [progress, setProgress] = useState(25);
  const [storeConnected, setStoreConnected] = useState(false);
  const [adPlatforms, setAdPlatforms] = useState<string[]>([]);
  const [productSetupComplete, setProductSetupComplete] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  const { user, setHasCompletedOnboarding } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Memoize the step update logic
  const updateStep = useCallback((path: string | undefined) => {
    switch (path) {
      case 'store':
        setCurrentStep('store');
        setProgress(25);
        break;
      case 'ads':
        setCurrentStep('ads');
        setProgress(50);
        break;
      case 'products':
        setCurrentStep('products');
        setProgress(75);
        break;
      case 'complete':
        setCurrentStep('complete');
        setProgress(100);
        break;
      default:
        navigate('/onboarding/store', { replace: true });
    }
  }, [navigate]);
  
  // Update step based on URL changes
  useEffect(() => {
    const path = location.pathname.split('/').pop();
    updateStep(path);
  }, [location.pathname, updateStep]);
  
  const handleCompleteOnboarding = async () => {
    try {
      setIsCompleting(true);
      await setHasCompletedOnboarding(true);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsCompleting(false);
    }
  };
  
  const goToNextStep = () => {
    switch (currentStep) {
      case 'store':
        navigate('/onboarding/ads');
        break;
      case 'ads':
        navigate('/onboarding/products');
        break;
      case 'products':
        navigate('/onboarding/complete');
        break;
      case 'complete':
        handleCompleteOnboarding();
        break;
    }
  };
  
  const goToPreviousStep = () => {
    switch (currentStep) {
      case 'ads':
        navigate('/onboarding/store');
        break;
      case 'products':
        navigate('/onboarding/ads');
        break;
      case 'complete':
        navigate('/onboarding/products');
        break;
    }
  };
  
  const handleStoreConnected = useCallback((connected: boolean) => {
    setStoreConnected(connected);
  }, []);
  
  const handleAdPlatformsConnected = useCallback((platforms: string[]) => {
    setAdPlatforms(platforms);
  }, []);
  
  const handleProductSetupComplete = useCallback((completed: boolean) => {
    setProductSetupComplete(completed);
  }, []);

  // If onboarding completion is in progress, show loading state
  if (isCompleting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Completing onboarding...</p>
        </div>
      </div>
    );
  }
  
  return (
    <OnboardingLayout 
      currentStep={currentStep}
      progress={progress}
      onNext={goToNextStep}
      onPrevious={goToPreviousStep}
      canGoNext={
        (currentStep === 'store' && storeConnected) ||
        currentStep === 'ads' || // Allow proceeding without connecting ad platforms
        currentStep === 'products' || // Allow proceeding without setting up products
        currentStep === 'complete'
      }
      adPlatforms={adPlatforms}
      productSetupComplete={productSetupComplete}
    >
      <Routes>
        <Route 
          path="store" 
          element={
            <StoreIntegration 
              onStoreConnected={handleStoreConnected} 
            />
          } 
        />
        <Route 
          path="ads" 
          element={
            <AdPlatformIntegration 
              onPlatformsConnected={handleAdPlatformsConnected} 
            />
          } 
        />
        <Route 
          path="products" 
          element={
            <ProductSetup 
              onComplete={handleProductSetupComplete}
              storeConnected={storeConnected}
            />
          } 
        />
        <Route 
          path="complete" 
          element={
            <Completion 
              onComplete={handleCompleteOnboarding}
            />
          } 
        />
        <Route path="*" element={<StoreIntegration onStoreConnected={handleStoreConnected} />} />
      </Routes>
    </OnboardingLayout>
  );
};

export default Onboarding;