import React, { useState, useRef } from 'react';
import { ChevronDown, Check, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useClickOutside } from '@/lib/useClickOutside';
import { getActiveShopifyInstallation } from '@/lib/shopify/status';

interface CompletionProps {
  onComplete: () => void;
  onFormValidityChange?: (isValid: boolean) => void;
  onSubmit?: () => void;
}

const Completion: React.FC<CompletionProps> = ({ onComplete, onFormValidityChange, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    store_type: '',
    wants_growth_assistance: null as boolean | null,
    phone_number: ''
  });
  const [hasExistingData, setHasExistingData] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load existing data on mount
  React.useEffect(() => {
    const loadExistingData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setIsLoadingData(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('display_name, store_type, wants_growth_help, onboarding_completed_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profileError && profile) {
          const hasData = !!(profile.display_name || profile.store_type || profile.wants_growth_help !== null);
          setHasExistingData(hasData);

          if (hasData) {
            setFormData({
              name: profile.display_name || '',
              store_type: profile.store_type || '',
              wants_growth_assistance: profile.wants_growth_help
            });
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadExistingData();
  }, []);

  // Check if form is valid (and mark as valid if already completed)
  // If they want help, phone number is required
  const isFormValid = (
    formData.name.trim() !== '' &&
    formData.store_type !== '' &&
    formData.wants_growth_assistance !== null &&
    (formData.wants_growth_assistance === false || formData.phone_number.trim() !== '')
  ) || hasExistingData;

  // Notify parent of form validity changes
  React.useEffect(() => {
    onFormValidityChange?.(isFormValid);
  }, [isFormValid, onFormValidityChange]);
  const [isLoading, setIsLoading] = useState(false);
  const [showStoreTypeDropdown, setShowStoreTypeDropdown] = useState(false);
  const storeTypeDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(storeTypeDropdownRef, () => setShowStoreTypeDropdown(false));

  const storeTypes = [
    { value: 'general', label: 'General Store', description: 'Multiple product categories' },
    { value: 'niche', label: 'Niche Store', description: 'Focused on a specific category' },
    { value: 'single_product', label: 'Single Product', description: 'One hero product' }
  ];

  const getStoreTypeLabel = () => {
    const type = storeTypes.find(t => t.value === formData.store_type);
    return type ? type.label : 'Select store type';
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      return;
    }

    if (!formData.store_type) {
      return;
    }

    if (formData.wants_growth_assistance === null) {
      return;
    }

    if (formData.wants_growth_assistance && !formData.phone_number.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User not found');
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          display_name: formData.name.trim(),
          store_type: formData.store_type,
          wants_growth_help: formData.wants_growth_assistance,
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Save to onboarding_leads table
      const shopifyInstallation = await getActiveShopifyInstallation(user.id);

      // Check for connected ad platforms
      const { data: fbTokens } = await supabase
        .from('facebook_tokens')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: googleTokens } = await supabase
        .from('platform_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('platform', 'google_ads')
        .maybeSingle();

      const { data: tiktokTokens } = await supabase
        .from('platform_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('platform', 'tiktok_ads')
        .maybeSingle();

      await supabase
        .from('onboarding_leads')
        .upsert({
          user_id: user.id,
          name: formData.name.trim(),
          email: user.email || '',
          phone_number: formData.wants_growth_assistance ? formData.phone_number.trim() : null,
          store_type: formData.store_type,
          wants_help: formData.wants_growth_assistance,
          shopify_store_domain: shopifyInstallation?.shop_domain || null,
          shopify_connected: !!shopifyInstallation,
          facebook_ads_connected: !!fbTokens,
          google_ads_connected: !!googleTokens,
          tiktok_ads_connected: !!tiktokTokens,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      setIsLoading(false);
    }
  };

  // Expose handleSubmit to parent via onSubmit prop
  React.useEffect(() => {
    if (onSubmit) {
      // Store the submit handler reference
      (window as any).__completionSubmitHandler = handleSubmit;
    }
  }, [handleSubmit, onSubmit]);

  if (isLoadingData) {
    return null;
  }

  return (
    <div className="max-w-[540px] mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-medium text-gray-900 dark:text-white mb-2">One Last Thing!</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Help us personalize your experience
          </p>
          {hasExistingData && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
              <Check className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Previously completed</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What should we call you?
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What type of store do you run?
            </label>
            <div className="relative" ref={storeTypeDropdownRef}>
              <button
                type="button"
                onClick={() => setShowStoreTypeDropdown(!showStoreTypeDropdown)}
                disabled={isLoading}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-left flex items-center justify-between bg-white dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className={formData.store_type ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                  {getStoreTypeLabel()}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showStoreTypeDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showStoreTypeDropdown && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 max-h-60 overflow-auto">
                  {storeTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, store_type: type.value });
                        setShowStoreTypeDropdown(false);
                      }}
                      className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{type.label}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{type.description}</div>
                      </div>
                      {formData.store_type === type.value && <Check className="w-4 h-4 text-rose-500 flex-shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Want help scaling your store?
            </label>
            <div className="space-y-3">
              {/* Yes option */}
              <div
                onClick={() => !isLoading && setFormData({ ...formData, wants_growth_assistance: true })}
                className={`p-4 rounded-lg cursor-pointer transition-all border ${
                  formData.wants_growth_assistance === true
                    ? 'border-gray-900 dark:border-gray-100 ring-2 ring-gray-900 dark:ring-gray-100 bg-gray-50 dark:bg-gray-900/50'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    formData.wants_growth_assistance === true
                      ? 'border-gray-900 dark:border-white'
                      : 'border-gray-400 dark:border-gray-500'
                  }`}>
                    {formData.wants_growth_assistance === true && (
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-900 dark:bg-white" />
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">Yes, connect me with your growth team</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Have our expert Shopify growth team personally reach out</div>

                    {/* Phone number field - appears when "Yes" is selected */}
                    {formData.wants_growth_assistance === true && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Phone number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="tel"
                            value={formData.phone_number}
                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="+1 (555) 123-4567"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-gray-900 dark:focus:border-gray-100 text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            disabled={isLoading}
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">We'll reach out within 24 hours</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* No option */}
              <div
                onClick={() => !isLoading && setFormData({ ...formData, wants_growth_assistance: false, phone_number: '' })}
                className={`p-4 rounded-lg cursor-pointer transition-all border ${
                  formData.wants_growth_assistance === false
                    ? 'border-gray-900 dark:border-gray-100 ring-2 ring-gray-900 dark:ring-gray-100 bg-gray-50 dark:bg-gray-900/50'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    formData.wants_growth_assistance === false
                      ? 'border-gray-900 dark:border-white'
                      : 'border-gray-400 dark:border-gray-500'
                  }`}>
                    {formData.wants_growth_assistance === false && (
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-900 dark:bg-white" />
                    )}
                  </div>
                  <div className="ml-3">
                    <div className="font-medium text-gray-900 dark:text-white">No, I don't want help from the 7-8 figure experts</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">I'll explore the platform on my own</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Completion;
