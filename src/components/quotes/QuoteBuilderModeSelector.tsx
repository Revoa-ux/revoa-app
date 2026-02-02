import React from 'react';
import { Zap, Table2 } from 'lucide-react';

interface QuoteBuilderModeSelectorProps {
  onModeSelect: (mode: 'guided' | 'quick') => void;
}

export const QuoteBuilderModeSelector: React.FC<QuoteBuilderModeSelectorProps> = ({
  onModeSelect
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Choose Your Setup Method
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Pick the mode that works best for you. You can switch anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          type="button"
          onClick={() => onModeSelect('guided')}
          className="group relative p-8 bg-white dark:bg-dark rounded-xl border-2 border-gray-200 dark:border-[#3a3a3a] hover:border-rose-500 dark:hover:border-rose-500 hover:shadow-xl transition-all duration-200"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Zap className="w-8 h-8 text-white" />
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Guided Mode
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Step-by-step setup with helpful guidance. Perfect for complex quotes or when you want assistance.
              </p>
            </div>

            <div className="pt-4 space-y-2 text-xs text-gray-500 dark:text-gray-500">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                <span>Progressive steps</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                <span>Helpful tooltips</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                <span>Visual builders</span>
              </div>
            </div>
          </div>

          <div className="absolute top-4 right-4 px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-medium rounded">
            Recommended
          </div>
        </button>

        <button
          type="button"
          onClick={() => onModeSelect('quick')}
          className="group p-8 bg-white dark:bg-dark rounded-xl border-2 border-gray-200 dark:border-[#3a3a3a] hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl transition-all duration-200"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Table2 className="w-8 h-8 text-white" />
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Quick Mode
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Spreadsheet-style bulk editor. Fast and efficient for experienced users or simple quotes.
              </p>
            </div>

            <div className="pt-4 space-y-2 text-xs text-gray-500 dark:text-gray-500">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span>Bulk editing</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span>Inline editing</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span>Fast input</span>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
