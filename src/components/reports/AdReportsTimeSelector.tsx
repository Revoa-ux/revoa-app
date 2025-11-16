import React, { useState, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Check, X } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import Calendar from '@/components/Calendar';

export type TimeOption = 'today' | 'yesterday' | '7d' | '14d' | '28d' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'ytd' | 'custom';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface AdReportsTimeSelectorProps {
  selectedTime: TimeOption;
  onTimeChange: (time: TimeOption) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
  onApply?: () => void;
}

const AdReportsTimeSelector: React.FC<AdReportsTimeSelectorProps> = ({
  selectedTime,
  onTimeChange,
  dateRange = {
    startDate: new Date(),
    endDate: new Date()
  },
  onDateRangeChange = () => {},
  onApply = () => {}
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(dateRange.startDate);
  const [tempEndDate, setTempEndDate] = useState(dateRange.endDate);
  const [selectingStart, setSelectingStart] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const customPickerRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => {
    if (!showCustomPicker) {
      setShowDropdown(false);
    }
  });

  useClickOutside(customPickerRef, () => {
    if (showCustomPicker) {
      setShowCustomPicker(false);
      setShowDropdown(false);
    }
  });

  const getTimeLabel = (time: TimeOption): string => {
    switch (time) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case '7d': return 'Last 7 days';
      case '14d': return 'Last 14 days';
      case '28d': return 'Last 28 days';
      case 'thisMonth': return 'This Month';
      case 'lastMonth': return 'Last Month';
      case 'last3Months': return 'Last 3 Months';
      case 'ytd': return 'Year to Date';
      case 'custom': {
        const start = tempStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const end = tempEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${start} - ${end}`;
      }
      default: return 'Today';
    }
  };

  const timeOptions: TimeOption[] = [
    'today',
    'yesterday',
    '7d',
    '14d',
    '28d',
    'thisMonth',
    'lastMonth',
    'last3Months',
    'ytd',
    'custom'
  ];

  const handleTimeSelect = (time: TimeOption) => {
    // Update date range based on selection
    const startDate = new Date();
    const endDate = new Date();

    switch (time) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '14d':
        startDate.setDate(startDate.getDate() - 14);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '28d':
        startDate.setDate(startDate.getDate() - 28);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth': {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        startDate.setFullYear(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setFullYear(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'last3Months':
        startDate.setMonth(startDate.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'ytd':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        // Open custom date picker
        setTempStartDate(dateRange.startDate);
        setTempEndDate(dateRange.endDate);
        setSelectingStart(true);
        setShowCustomPicker(true);
        onTimeChange(time);
        return;
    }

    onDateRangeChange({ startDate, endDate });
    onTimeChange(time);
    setShowDropdown(false);
    if (onApply) {
      onApply();
    }
  };

  const handleDateSelect = (date: Date) => {
    if (selectingStart) {
      const newStart = new Date(date);
      newStart.setHours(0, 0, 0, 0);
      setTempStartDate(newStart);

      // If end date is before new start date, adjust it
      if (tempEndDate < newStart) {
        const newEnd = new Date(newStart);
        newEnd.setHours(23, 59, 59, 999);
        setTempEndDate(newEnd);
      }

      setSelectingStart(false);
    } else {
      const newEnd = new Date(date);
      newEnd.setHours(23, 59, 59, 999);

      // If end date is before start date, swap them
      if (newEnd < tempStartDate) {
        setTempEndDate(tempStartDate);
        setTempStartDate(newEnd);
      } else {
        setTempEndDate(newEnd);
      }

      setSelectingStart(true);
    }
  };

  const handleApplyCustomDate = () => {
    onDateRangeChange({ startDate: tempStartDate, endDate: tempEndDate });
    setShowCustomPicker(false);
    setShowDropdown(false);
    if (onApply) {
      onApply();
    }
  };

  const handleCancelCustomDate = () => {
    setShowCustomPicker(false);
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center justify-between h-[38px] px-4 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-[180px]"
      >
        <div className="flex items-center">
          <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
          <span>{getTimeLabel(selectedTime)}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
      </button>

      {showDropdown && !showCustomPicker && (
        <div className="absolute right-0 mt-2 w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          {timeOptions.map((time) => (
            <button
              key={time}
              onClick={() => handleTimeSelect(time)}
              className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span>{time === 'custom' ? 'Custom Date' : getTimeLabel(time)}</span>
              {selectedTime === time && <Check className="w-4 h-4 text-primary-500" />}
            </button>
          ))}
        </div>
      )}

      {showCustomPicker && (
        <div
          ref={customPickerRef}
          className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Select Date Range</h3>
            <button
              onClick={handleCancelCustomDate}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setSelectingStart(true)}
              className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                selectingStart
                  ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <div className="text-[10px] uppercase font-medium mb-0.5">Start Date</div>
              <div className="font-medium">
                {tempStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </button>
            <div className="text-gray-400">→</div>
            <button
              onClick={() => setSelectingStart(false)}
              className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                !selectingStart
                  ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <div className="text-[10px] uppercase font-medium mb-0.5">End Date</div>
              <div className="font-medium">
                {tempEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </button>
          </div>

          <div className="mb-4">
            <Calendar
              selectedDate={selectingStart ? tempStartDate : tempEndDate}
              maxDate={new Date()}
              onSelect={handleDateSelect}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelCustomDate}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyCustomDate}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-rose-500 to-orange-400 hover:shadow-lg hover:shadow-rose-500/25 rounded-lg transition-all"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdReportsTimeSelector;
