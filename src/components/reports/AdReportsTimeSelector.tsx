import React, { useState, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Check, X } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import Calendar from '@/components/Calendar';

export type TimeOption = 'today' | 'yesterday' | '7d' | '14d' | '28d' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'ytd' | '1y' | 'custom';

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
  disabled?: boolean;
  isBlurred?: boolean;
}

const AdReportsTimeSelector: React.FC<AdReportsTimeSelectorProps> = ({
  selectedTime,
  onTimeChange,
  dateRange = {
    startDate: new Date(),
    endDate: new Date()
  },
  onDateRangeChange = () => {},
  onApply = () => {},
  disabled = false,
  isBlurred = false
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
      case '1y': return 'Last Year';
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
      case '1y': return '1Y';
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
    '1y',
    'custom'
  ];

  const handleTimeSelect = (time: TimeOption) => {
    const startDate = new Date();
    const endDate = new Date();

    console.log('[AdReportsTimeSelector] handleTimeSelect called with:', time);

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
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
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

    console.log('[AdReportsTimeSelector] Setting date range:', {
      time,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      startDateFull: startDate.toISOString(),
      endDateFull: endDate.toISOString(),
      daysDiff: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    });

    console.log('[AdReportsTimeSelector] Calling onDateRangeChange...');
    onDateRangeChange({ startDate, endDate });
    console.log('[AdReportsTimeSelector] Calling onTimeChange...');
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
        onClick={() => !disabled && !isBlurred && setShowDropdown(!showDropdown)}
        disabled={disabled || isBlurred}
        className={`w-full h-[38px] px-4 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg ${!isBlurred ? 'hover:bg-gray-50 dark:hover:bg-[#3a3a3a]' : 'cursor-not-allowed'} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className={`flex items-center justify-between ${isBlurred ? 'blur-sm pointer-events-none select-none' : ''}`}>
          <div className="flex items-center min-w-0">
            <CalendarIcon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
            <span className="hidden sm:inline truncate">{getTimeLabel(selectedTime)}</span>
            <span className="sm:hidden truncate">{getMobileTimeLabel(selectedTime)}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 ml-2 flex-shrink-0 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {showDropdown && !showCustomPicker && (
        <div className="absolute right-0 mt-2 min-w-[160px] w-auto bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden z-[100]">
          {timeOptions.map((time, index) => (
            <button
              key={time}
              onClick={() => handleTimeSelect(time)}
              className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors whitespace-nowrap ${
                index === 0 ? 'first:rounded-t-lg' : ''
              } ${index === timeOptions.length - 1 ? 'last:rounded-b-lg' : ''}`}
            >
              <span className="mr-3">{time === 'custom' ? 'Custom Date' : getTimeLabel(time)}</span>
              {selectedTime === time && <Check className="w-4 h-4 text-primary-500" />}
            </button>
          ))}
        </div>
      )}

      {showCustomPicker && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[90]"
            onClick={handleCancelCustomDate}
          />
          <div
            ref={customPickerRef}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[380px] max-w-[calc(100vw-2rem)] bg-white dark:bg-dark rounded-lg shadow-xl border border-gray-200 dark:border-[#3a3a3a] p-3 z-[100]"
            style={{
              marginLeft: 'max(0px, env(safe-area-inset-left))',
              marginRight: 'max(0px, env(safe-area-inset-right))'
            }}
          >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Select Date Range</h3>
            <button
              onClick={handleCancelCustomDate}
              className="p-1 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded transition-colors"
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
                  : 'btn btn-secondary'
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
                  : 'btn btn-secondary'
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
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyCustomDate}
              className="btn btn-danger flex-1"
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
