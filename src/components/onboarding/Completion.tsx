import React, { useState, useRef } from 'react';
import { ArrowRight, ChevronDown, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useClickOutside } from '@/lib/useClickOutside';

interface CompletionProps {
  onComplete: () => void;
}

const Completion: React.FC<CompletionProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    name: '',
    store_type: '',
    wants_growth_assistance: false
  });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!formData.store_type) {
      toast.error('Please select your store type');
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
          name: formData.name.trim(),
          store_type: formData.store_type,
          wants_growth_assistance: formData.wants_growth_assistance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save your information. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[540px] mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-medium text-gray-900 mb-2">One Last Thing</h2>
          <p className="text-sm text-gray-600">
            Help us personalize your experience
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              What should we call you?
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What type of store do you run?
            </label>
            <div className="relative" ref={storeTypeDropdownRef}>
              <button
                type="button"
                onClick={() => setShowStoreTypeDropdown(!showStoreTypeDropdown)}
                disabled={isLoading}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-left flex items-center justify-between bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className={formData.store_type ? 'text-gray-900' : 'text-gray-500'}>
                  {getStoreTypeLabel()}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {showStoreTypeDropdown && (
                <div className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-60 overflow-auto">
                  {storeTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, store_type: type.value });
                        setShowStoreTypeDropdown(false);
                      }}
                      className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{type.label}</div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                      </div>
                      {formData.store_type === type.value && <Check className="w-4 h-4 text-rose-500 flex-shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Want help scaling your store?
            </label>
            <div className="space-y-3">
              {[
                {
                  value: true,
                  label: 'Yes, connect me with your growth team',
                  description: 'Have our expert Shopify growth team personally reach out'
                },
                {
                  value: false,
                  label: "No, I don't want help from the 7-8 figure experts on Revoa's team",
                  description: "I'll explore the platform on my own"
                }
              ].map((option) => (
                <label
                  key={option.value.toString()}
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.wants_growth_assistance === option.value
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="wants_growth_assistance"
                    checked={formData.wants_growth_assistance === option.value}
                    onChange={() => setFormData({ ...formData, wants_growth_assistance: option.value })}
                    className="mt-1 text-rose-500 focus:ring-rose-500"
                    disabled={isLoading}
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] text-white rounded-lg hover:opacity-90 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? 'Saving...' : (
              <>
                Finish
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Completion;
