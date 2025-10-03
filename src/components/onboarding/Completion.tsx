import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-rose-50 to-pink-50 mb-4">
            <Sparkles className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-3xl font-medium text-gray-900 mb-2">One Last Thing</h2>
          <p className="text-sm text-gray-600">
            Help us personalize your experience
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              What's your name?
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
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What type of store do you run?
            </label>
            <div className="space-y-3">
              {[
                { value: 'general', label: 'General Store', description: 'Multiple product categories' },
                { value: 'niche', label: 'Niche Store', description: 'Focused on a specific category' },
                { value: 'single_product', label: 'Single Product', description: 'One hero product' }
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.store_type === option.value
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="store_type"
                    value={option.value}
                    checked={formData.store_type === option.value}
                    onChange={(e) => setFormData({ ...formData, store_type: e.target.value })}
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

          <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg p-5 border border-rose-100">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={formData.wants_growth_assistance}
                onChange={(e) => setFormData({ ...formData, wants_growth_assistance: e.target.checked })}
                className="mt-1 text-rose-500 focus:ring-rose-500 rounded"
                disabled={isLoading}
              />
              <div className="ml-3">
                <div className="font-medium text-gray-900 mb-1">
                  Get Help from Our Growth Team
                </div>
                <div className="text-sm text-gray-600">
                  Have our expert Shopify growth team personally reach out to see if we can help scale your store
                </div>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] text-white rounded-lg hover:opacity-90 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Completion;
