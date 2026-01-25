import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useConnectionStore } from '../lib/connectionStore';
import StoreIntegration from '../components/onboarding/StoreIntegration';
import ShopifyIntegration from '../components/onboarding/ShopifyIntegration';
import AdPlatformIntegration from '../components/onboarding/AdPlatformIntegration';
import ProductSetup from '../components/onboarding/ProductSetup';
import Completion from '../components/onboarding/Completion';
import OnboardingLayout from '../components/onboarding/OnboardingLayout';
import { LoadingSpinner } from '../components/PageSkeletons';

export type OnboardingStep = 'store' | 'ads' | 'products' | 'complete';

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('store');
  const [progress, setProgress] = useState(0);
  const [storeConnected, setStoreConnected] = useState(false);
  const [adPlatforms, setAdPlatforms] = useState<string[]>([]);
  const [productSetupComplete, setProductSetupComplete] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionFormValid, setCompletionFormValid] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);

  const { setHasCompletedOnboarding, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Use centralized connection store
  const { shopify, facebook } = useConnectionStore();

  // Memoize the step update logic
  const updateStep = useCallback((path: string | undefined) => {
    switch (path) {
      case 'store':
      case 'shopify': // Treat 'shopify' as equivalent to 'store' (App Store installs)
        setCurrentStep('store');
        setProgress(0);
        break;
      case 'ads':
        setCurrentStep('ads');
        setProgress(33);
        break;
      case 'products':
        setCurrentStep('products');
        setProgress(66);
        break;
      case 'complete':
        setCurrentStep('complete');
        setProgress(100);
        break;
      default:
        navigate('/onboarding/store', { replace: true });
    }
  }, [navigate]);
  
  // Watch connection store for Shopify status changes
  useEffect(() => {    setStoreConnected(shopify.isConnected);
  }, [shopify.isConnected]);

  // Watch connection store for Facebook status changes
  useEffect(() => {    if (facebook.isConnected && !adPlatforms.includes('facebook')) {
      setAdPlatforms(prev => [...prev, 'facebook']);
    } else if (!facebook.isConnected && adPlatforms.includes('facebook')) {
      setAdPlatforms(prev => prev.filter(p => p !== 'facebook'));
    }
  }, [facebook.isConnected]);

  // Check onboarding status on mount
  useEffect(() => {
    if (!user) return;

    const checkOnboardingStatus = async () => {
      try {
        // Check if profile is complete
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('display_name, store_type, wants_growth_help')
          .eq('user_id', user.id)
          .maybeSingle();

        setProfileComplete(!!(
          profileData?.display_name &&
          profileData?.store_type &&
          profileData?.wants_growth_help !== null
        ));

        setIsCheckingStatus(false);
      } catch (error) {
        setIsCheckingStatus(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  // Update step based on URL changes
  useEffect(() => {
    const path = location.pathname.split('/').pop();
    updateStep(path);
  }, [location.pathname, updateStep]);

  // Auto-skip store step if Shopify is already connected (e.g., from Shopify App Store)
  // DISABLED: This was causing the next button to not appear and auto-advancing
  // useEffect(() => {
  //   const currentPath = location.pathname.split('/').pop();
  //   if (currentPath === 'store' && shopify.isConnected) {
  //     navigate('/onboarding/ads', { replace: true });
  //   }
  // }, [shopify.isConnected, location.pathname, navigate]);
  
  const handleCompleteOnboarding = async () => {
    try {
      setIsCompleting(true);
      await setHasCompletedOnboarding(true);
      navigate('/', { replace: true });
    } catch (error) {
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
        // Trigger the completion form submission
        if ((window as any).__completionSubmitHandler) {
          (window as any).__completionSubmitHandler();
        }
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
  
  const handleStoreConnected = useCallback((connected: boolean) => {    setStoreConnected(connected);  }, []);
  
  const handleAdPlatformsConnected = useCallback((platforms: string[]) => {
    setAdPlatforms(platforms);
  }, []);
  
  const handleProductSetupComplete = useCallback((completed: boolean) => {
    setProductSetupComplete(completed);
  }, []);

  const handleCompletionFormValidityChange = useCallback((isValid: boolean) => {
    setCompletionFormValid(isValid);
  }, []);

  // Only show loading when completing onboarding (not when checking status)
  if (isCompleting) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            Completing onboarding...
          </p>
        </div>
      </div>
    );
  }
  
  const canGoNext =
    (currentStep === 'store' && storeConnected) ||
    currentStep === 'ads' ||
    currentStep === 'products' ||
    (currentStep === 'complete' && completionFormValid);
  return (
    <OnboardingLayout
      currentStep={currentStep}
      progress={progress}
      onNext={goToNextStep}
      onPrevious={goToPreviousStep}
      canGoNext={canGoNext}
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
          path="shopify"
          element={
            <ShopifyIntegration
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
              onFinish={() => navigate('/onboarding/complete')}
              storeConnected={storeConnected}
            />
          }
        />
        <Route
          path="complete"
          element={
            <Completion
              onComplete={handleCompleteOnboarding}
              onFormValidityChange={handleCompletionFormValidityChange}
              onSubmit={() => {}}
            />
          }
        />
        <Route path="*" element={<StoreIntegration onStoreConnected={handleStoreConnected} />} />
      </Routes>
    </OnboardingLayout>
  );
};

export default Onboarding;