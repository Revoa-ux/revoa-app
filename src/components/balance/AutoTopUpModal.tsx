import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, Loader2, Bell, Clock, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useClickOutside } from '@/lib/useClickOutside';

interface AutoTopUpModalProps {
  onClose: () => void;
  onSave: (config: AutoTopUpConfig) => Promise<void>;
  currentConfig?: AutoTopUpConfig;
}

interface AutoTopUpConfig {
  enabled: boolean;
  threshold: number;
  amount: number;
}

export const AutoTopUpModal: React.FC<AutoTopUpModalProps> = ({
  onClose,
  onSave,
  currentConfig
}) => {
  const [config, setConfig] = useState<AutoTopUpConfig>(currentConfig || {
    enabled: false,
    threshold: 5000,
    amount: 10000
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);

  useClickOutside(modalRef, onClose);

  // These would normally come from your order history
  const dailyOrderValue = 4200;
  const suggestedAmounts = {
    week: 30000,
    twoWeeks: 60000,
    month: 125000
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (config.threshold <= 0 || config.amount <= 0) {
      setError('Please enter valid amounts');
      return;
    }

    if (config.amount <= config.threshold) {
      setError('Top-up amount must be greater than threshold');
      return;
    }

    try {
      setLoading(true);
      await onSave(config);
      toast.success('Auto top-up settings saved successfully');
      onClose();
    } catch (error) {
      setError('Failed to save configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="fixed inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl w-full max-w-md" ref={modalRef}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Auto Top-up Settings</h3>
                  <p className="text-sm text-gray-500 mt-1">Automatically charge via Stripe when balance is low</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Bell className="w-5 h-5 text-gray-900" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Enable Auto Top-up</p>
                      <p className="text-xs text-gray-500">Automatically add funds when balance is low</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Balance Threshold
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={config.threshold}
                      onChange={(e) => setConfig({ ...config, threshold: parseInt(e.target.value) })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter threshold amount"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    Auto top-up will trigger when balance falls below this amount
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-900">Suggested Top-up Amounts</h4>
                    <span className="text-xs text-gray-500">${dailyOrderValue.toLocaleString()} daily average</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, amount: suggestedAmounts.week }))}
                      className={`group relative bg-white rounded-xl transition-all duration-200 ${
                        config.amount === suggestedAmounts.week
                          ? 'bg-gradient-to-br from-red-50 to-red-100/50'
                          : 'hover:bg-red-50'
                      }`}
                    >
                      <div className={`p-4 border rounded-xl transition-all duration-200 ${
                        config.amount === suggestedAmounts.week
                          ? 'border-red-300 shadow-[0_2px_8px_-2px_rgba(239,68,68,0.2)]'
                          : 'border-red-200/80 group-hover:border-red-300 group-hover:shadow-[0_2px_8px_-2px_rgba(239,68,68,0.1)]'
                      }`}>
                        <div className="flex flex-col items-start space-y-1">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm font-medium text-gray-900">1 Week</span>
                            <div className="p-1 rounded-full bg-red-100 group-hover:bg-red-200 transition-colors">
                              <Clock className="w-3.5 h-3.5 text-red-500" />
                            </div>
                          </div>
                          <span className="text-lg font-semibold text-gray-900">${suggestedAmounts.week.toLocaleString()}</span>
                        </div>
                      </div>
                      {config.amount === suggestedAmounts.week && (
                        <div className="absolute inset-0 border-2 border-red-500/80 rounded-xl pointer-events-none" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, amount: suggestedAmounts.twoWeeks }))}
                      className={`group relative bg-white rounded-xl transition-all duration-200 ${
                        config.amount === suggestedAmounts.twoWeeks
                          ? 'bg-gradient-to-br from-red-50 to-red-100/50'
                          : 'hover:bg-red-50'
                      }`}
                    >
                      <div className={`p-4 border rounded-xl transition-all duration-200 ${
                        config.amount === suggestedAmounts.twoWeeks
                          ? 'border-red-300 shadow-[0_2px_8px_-2px_rgba(239,68,68,0.2)]'
                          : 'border-red-200/80 group-hover:border-red-300 group-hover:shadow-[0_2px_8px_-2px_rgba(239,68,68,0.1)]'
                      }`}>
                        <div className="flex flex-col items-start space-y-1">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm font-medium text-gray-900">2 Weeks</span>
                            <div className="p-1 rounded-full bg-red-100 group-hover:bg-red-200 transition-colors">
                              <Clock className="w-3.5 h-3.5 text-red-500" />
                            </div>
                          </div>
                          <span className="text-lg font-semibold text-gray-900">${suggestedAmounts.twoWeeks.toLocaleString()}</span>
                        </div>
                      </div>
                      {config.amount === suggestedAmounts.twoWeeks && (
                        <div className="absolute inset-0 border-2 border-red-500/80 rounded-xl pointer-events-none" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, amount: suggestedAmounts.month }))}
                      className={`group relative bg-white rounded-xl transition-all duration-200 ${
                        config.amount === suggestedAmounts.month
                          ? 'bg-gradient-to-br from-red-50 to-red-100/50'
                          : 'hover:bg-red-50'
                      }`}
                    >
                      <div className={`p-4 border rounded-xl transition-all duration-200 ${
                        config.amount === suggestedAmounts.month
                          ? 'border-red-300 shadow-[0_2px_8px_-2px_rgba(239,68,68,0.2)]'
                          : 'border-red-200/80 group-hover:border-red-300 group-hover:shadow-[0_2px_8px_-2px_rgba(239,68,68,0.1)]'
                      }`}>
                        <div className="flex flex-col items-start space-y-1">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm font-medium text-gray-900">1 Month</span>
                            <div className="p-1 rounded-full bg-red-100 group-hover:bg-red-200 transition-colors">
                              <Calendar className="w-3.5 h-3.5 text-red-500" />
                            </div>
                          </div>
                          <span className="text-lg font-semibold text-gray-900">${suggestedAmounts.month.toLocaleString()}</span>
                        </div>
                      </div>
                      {config.amount === suggestedAmounts.month && (
                        <div className="absolute inset-0 border-2 border-red-500/80 rounded-xl pointer-events-none" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Top-up Amount
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={config.amount}
                      onChange={(e) => setConfig({ ...config, amount: parseInt(e.target.value) })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter custom amount"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    Amount to add when auto top-up is triggered
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-5 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-5 py-1.5 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};