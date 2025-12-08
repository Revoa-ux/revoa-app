import { useState, useEffect, useRef } from 'react';
import { DollarSign, Edit3, TrendingUp, AlertTriangle, Check, X } from 'lucide-react';

interface SellingPriceEditorProps {
  currentPrice: string;
  cost: number;
  suggestedPrice: number;
  onChange: (price: number | null) => void;
  value?: number | null;
}

export function SellingPriceEditor({
  currentPrice,
  cost,
  suggestedPrice,
  onChange,
  value,
}: SellingPriceEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const displayPrice = value !== null && value !== undefined ? value : parseFloat(currentPrice);
  const hasChanged = value !== null && value !== undefined && Math.abs(value - parseFloat(currentPrice)) > 0.01;

  const margin = displayPrice - cost;
  const marginPercent = ((margin / cost) * 100);
  const isLowMargin = margin < 20;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEdit = () => {
    setEditValue(displayPrice.toFixed(2));
    setIsEditing(true);
  };

  const handleSave = () => {
    const newPrice = parseFloat(editValue);
    if (!isNaN(newPrice) && newPrice > 0) {
      if (Math.abs(newPrice - parseFloat(currentPrice)) < 0.01) {
        onChange(null);
      } else {
        onChange(newPrice);
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleUseSuggested = () => {
    if (Math.abs(suggestedPrice - parseFloat(currentPrice)) < 0.01) {
      onChange(null);
    } else {
      onChange(suggestedPrice);
    }
  };

  return (
    <div className="space-y-2">
      {/* Price Display */}
      {isEditing ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              $
            </span>
            <input
              ref={inputRef}
              type="number"
              step="0.01"
              min="0"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="w-full pl-7 pr-3 py-1.5 text-sm border border-pink-500 dark:border-pink-400 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400"
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                ${displayPrice.toFixed(2)}
              </span>
              {hasChanged && (
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-medium">
                  Will update
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleEdit}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Edit price"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profit Margin */}
      <div className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
        <span className="text-gray-600 dark:text-gray-400">Profit Margin:</span>
        <span className={`font-semibold ${
          isLowMargin
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-green-600 dark:text-green-400'
        }`}>
          ${margin.toFixed(2)} ({marginPercent.toFixed(1)}%)
        </span>
      </div>

      {/* Low Margin Warning */}
      {isLowMargin && (
        <div className="flex items-start gap-1.5 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-tight">
            Low margin - consider packs
          </p>
        </div>
      )}

      {/* Suggested Price */}
      <div className="pt-1.5 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-600 dark:text-gray-400">Suggested:</span>
          <span className="text-gray-900 dark:text-white font-semibold">
            ${suggestedPrice.toFixed(2)}
          </span>
        </div>
        {Math.abs(suggestedPrice - displayPrice) > 0.01 && (
          <button
            type="button"
            onClick={handleUseSuggested}
            className="w-full px-2.5 py-1 text-xs font-medium text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg transition-colors"
          >
            Use Suggested Price
          </button>
        )}
      </div>
    </div>
  );
}
