import { useState, useEffect, useRef } from 'react';
import { DollarSign, Edit3, TrendingUp, AlertTriangle, Check, X, ArrowRight } from 'lucide-react';

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
  const marginPercent = displayPrice > 0 ? ((margin / displayPrice) * 100) : 0;
  const isLowMargin = marginPercent < 40;

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

  // Determine color classes based on margin percentage
  const getMarginColorClass = () => {
    if (marginPercent < 30) return 'text-red-600 dark:text-red-400';
    if (marginPercent < 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getBadgeColorClass = () => {
    if (marginPercent < 30) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (marginPercent < 40) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  };

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Profit Margin */}
      <div className="flex-shrink-0">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          Margin
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${getBadgeColorClass()}`}>
          <span className={`text-sm font-semibold ${getMarginColorClass()}`}>
            ${margin.toFixed(2)}
          </span>
          <span className={`text-[11px] font-semibold opacity-70`}>
            {marginPercent.toFixed(0)}%
          </span>
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Suggested Price Button */}
      {Math.abs(suggestedPrice - displayPrice) > 0.01 ? (
        <div className="flex-shrink-0 flex flex-col">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Suggested Price
          </div>
          <button
            type="button"
            onClick={handleUseSuggested}
            className="px-3 py-1.5 text-sm font-normal bg-gray-100 dark:bg-[#3a3a3a] hover:bg-gray-200 dark:hover:bg-[#4a4a4a] rounded-lg transition-all whitespace-nowrap inline-flex items-center gap-1.5"
          >
            <span className="text-gray-500 dark:text-gray-400">Change to</span>
            <span className="text-gray-700 dark:text-gray-200 font-medium">${suggestedPrice.toFixed(2)}</span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-700 dark:text-gray-200" />
          </button>
        </div>
      ) : hasChanged ? (
        <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark rounded-lg flex-shrink-0 whitespace-nowrap">
          Will sync on confirm
        </div>
      ) : null}
    </div>
  );
}
