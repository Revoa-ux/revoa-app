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
      {/* Profit Margin */}
      <div className="px-2.5 py-2 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-600 dark:text-gray-400">Profit Margin:</span>
          <span className={`font-semibold ${
            isLowMargin
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-green-600 dark:text-green-400'
          }`}>
            ${margin.toFixed(2)} ({marginPercent.toFixed(1)}%)
          </span>
        </div>
        {isLowMargin && (
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            Low margin - consider packs
          </p>
        )}
      </div>

      {/* Suggested Price Button */}
      {Math.abs(suggestedPrice - displayPrice) > 0.01 && (
        <button
          type="button"
          onClick={handleUseSuggested}
          className="w-full px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-500 hover:shadow-md rounded-lg transition-all"
        >
          Use ${suggestedPrice.toFixed(2)}
        </button>
      )}
    </div>
  );
}
