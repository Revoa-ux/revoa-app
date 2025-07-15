import React, { useState, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import Calendar from '@/components/Calendar';

export type TimeOption = 'today' | 'yesterday' | '7d' | '14d' | '30d' | '60d' | '90d' | 'this_month' | 'last_month' | 'ytd' | 'custom';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  
  useClickOutside(dropdownRef, () => setShowDropdown(false));
  useClickOutside(datePickerRef, () => setShowDatePicker(false));

  // Initialize with today's date range
  React.useEffect(() => {
    if (selectedTime === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      onDateRangeChange({ startDate: today, endDate: endOfDay });
    }
  }, [selectedTime, onDateRangeChange]);

  const getTimeLabel = (time: TimeOption): string => {
    switch (time) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case '7d': return 'Last 7 days';
      case '14d': return 'Last 14 days';
      case '30d': return 'Last 30 days';
      case '60d': return 'Last 60 days';
      case '90d': return 'Last 90 days';
      case 'this_month': return 'This month';
      case 'last_month': return 'Last month';
      case 'ytd': return 'Year to date';
      case 'custom': return 'Custom range';
      default: return 'Select timeframe';
    }
  };

  const formatDateRange = (range: DateRange): string => {
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }).format(date);
    };
    return `${formatDate(range.startDate)} - ${formatDate(range.endDate)}`;
  };

  const formatFullDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const timeOptions: TimeOption[] = [
    'today',
    'yesterday',
    '7d',
    '14d',
    '30d',
    '60d',
    '90d',
    'this_month',
    'last_month',
    'ytd',
    'custom'
  ];

  const handleTimeSelect = (time: TimeOption) => {
    if (time === 'custom') {
      setShowDatePicker(true); // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } else {
      // Update date range based on selection
      const now = new Date();
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
          break;
        case '14d':
          startDate.setDate(startDate.getDate() - 14);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '60d':
          startDate.setDate(startDate.getDate() - 60);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        // Add other cases as needed
      }

      onDateRangeChange({ startDate, endDate });
      onTimeChange(time);
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center justify-between h-[38px] px-4 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-[180px]"
      >
        <div className="flex items-center">
          <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
          <span>{selectedTime === 'custom' ? formatDateRange(dateRange) : getTimeLabel(selectedTime)}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-[180px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          {timeOptions.map((time) => (
            <button
              key={time}
              onClick={() => handleTimeSelect(time)}
              className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span>{getTimeLabel(time)}</span>
              {selectedTime === time && <Check className="w-4 h-4 text-primary-500" />}
            </button>
          ))}
        </div>
      )}

      {showDatePicker && (
        <div 
          ref={datePickerRef}
          className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-5 w-[600px] z-50"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    Start Date
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFullDate(dateRange.startDate)}
                  </span>
                </div>
                <Calendar
                  selectedDate={dateRange.startDate}
                  maxDate={dateRange.endDate}
                  onSelect={(date) => {
                    onDateRangeChange({
                      ...dateRange,
                      startDate: date
                    });
                  }}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    End Date
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFullDate(dateRange.endDate)}
                  </span>
                </div>
                <Calendar
                  selectedDate={dateRange.endDate}
                  minDate={dateRange.startDate}
                  maxDate={new Date()}
                  onSelect={(date) => {
                    onDateRangeChange({
                      ...dateRange,
                      endDate: date
                    });
                  }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between space-x-3">
                <button
                  onClick={() => {
                    setShowDatePicker(false);
                    setShowDropdown(false);
                  }}
                  className="flex-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onTimeChange('custom');
                    setShowDatePicker(false);
                    setShowDropdown(false);
                    onApply();
                  }}
                  className="flex-1 px-4 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors focus:outline-none"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdReportsTimeSelector;