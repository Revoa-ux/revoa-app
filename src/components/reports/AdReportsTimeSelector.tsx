import React, { useState, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';

export type TimeOption = 'today' | 'yesterday' | '7d' | '14d' | '28d';

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setShowDropdown(false));

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
      case '28d': return 'Last 28 days';
      default: return 'Today';
    }
  };

  const timeOptions: TimeOption[] = [
    'today',
    'yesterday',
    '7d',
    '14d',
    '28d'
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
    }

    onDateRangeChange({ startDate, endDate });
    onTimeChange(time);
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center justify-between h-[38px] px-4 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-[180px]"
      >
        <div className="flex items-center">
          <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
          <span>{getTimeLabel(selectedTime)}</span>
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
    </div>
  );
};

export default AdReportsTimeSelector;