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

  const getMobileTimeLabel = (time: TimeOption): string => {
    switch (time) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case '7d': return '7D';
      case '14d': return '14D';
      case '28d': return '28D';
      case 'thisMonth': return 'This M';
      case 'lastMonth': return 'Last M';
      case 'last3Months': return '3M';
      case 'ytd': return 'YTD';
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
        className="w-full flex items-center justify-between h-[38px] px-4 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center min-w-0">
          <CalendarIcon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <span className="hidden sm:inline truncate">{getTimeLabel(selectedTime)}</span>
          <span className="sm:hidden truncate">{getMobileTimeLabel(selectedTime)}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
      </button>

      {showDropdown && !showCustomPicker && (
        <div className="absolute right-0 mt-2 w-full sm:w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {timeOptions.map((time, index) => (
            <button
              key={time}
              onClick={() => handleTimeSelect(time)}
              className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                index === 0 ? 'first:rounded-t-lg' : ''
              } ${index === timeOptions.length - 1 ? 'last:rounded-b-lg' : ''}`}
            >
              <span>{time === 'custom' ? 'Custom Date' : getTimeLabel(time)}</span>
              {selectedTime === time && <Check className="w-4 h-4 text-primary-500" />}
            </button>
          ))}
        </div>
      )}

      {showCustomPicker && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleCancelCustomDate}
          />
          <div
            ref={customPickerRef}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[380px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-50"
            style={{
              marginLeft: 'max(0px, env(safe-area-inset-left))',
              marginRight: 'max(0px, env(safe-area-inset-right))'
            }}
          >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Select Date Range</h3>
            <button
              onClick={handleCancelCustomDate}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-3">
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

          <div className="mb-3 overflow-hidden">
            <Calendar
              selectedDate={selectingStart ? tempStartDate : tempEndDate}
              maxDate={new Date()}
              onSelect={handleDateSelect}
              startDate={tempStartDate}
              endDate={tempEndDate}
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
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 rounded-lg transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default AdReportsTimeSelector;
