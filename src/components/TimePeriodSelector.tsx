import React, { useState, useRef } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import Calendar from './Calendar';

export type TimePeriod = '1d' | '7d' | '30d' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface TimePeriodSelectorProps {
  timeframe: TimePeriod | string;
  setTimeframe: (timeframe: TimePeriod) => void;
  dateRange?: DateRange;
  setDateRange?: (dateRange: DateRange) => void;
  onApply?: () => void;
}

const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  timeframe,
  setTimeframe,
  dateRange = {
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  },
  setDateRange = () => {},
  onApply = () => {}
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  
  useClickOutside(selectorRef, () => {
    console.log("Click outside detected, closing date picker");
    setShowDatePicker(false);
  });

  const setQuickTimeframe = (period: '1d' | '7d' | '30d') => {
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case '1d':
        start.setDate(end.getDate() - 1);
        break;
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
    }
    
    setDateRange({ startDate: start, endDate: end });
    setTimeframe(period);
    setShowDatePicker(false);
    onApply();
  };

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    setTimeframe('custom');
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

  const handleCustomClick = () => {
    console.log("Custom button clicked, current state:", !showDatePicker);
    setShowDatePicker(!showDatePicker);
  };

  return (
    <div className="relative" ref={selectorRef}>
      <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 h-[46px] px-2">
        <button 
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors focus:outline-none ${timeframe === '1d' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          onClick={() => setQuickTimeframe('1d')}
        >
          24h
        </button>
        <button 
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors focus:outline-none ${timeframe === '7d' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          onClick={() => setQuickTimeframe('7d')}
        >
          7d
        </button>
        <button 
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors focus:outline-none ${timeframe === '30d' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          onClick={() => setQuickTimeframe('30d')}
        >
          30d
        </button>
        <button 
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center space-x-1.5 focus:outline-none ${
            timeframe === 'custom' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={handleCustomClick}
          data-testid="custom-date-button"
        >
          <CalendarIcon className="w-4 h-4" />
          <span>
            {timeframe === 'custom' ? formatDateRange(dateRange) : 'Custom'}
          </span>
        </button>
      </div>

      {showDatePicker && (
        <div 
          className="absolute right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-5 w-[600px] z-50"
          style={{ display: showDatePicker ? 'block' : 'none' }}
          data-testid="date-picker-modal"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-900">
                    Start Date
                  </label>
                  <span className="text-xs text-gray-500">
                    {formatFullDate(dateRange.startDate)}
                  </span>
                </div>
                <Calendar
                  selectedDate={dateRange.startDate}
                  maxDate={dateRange.endDate}
                  onSelect={(date) => {
                    handleDateRangeChange({
                      ...dateRange,
                      startDate: date
                    });
                  }}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-900">
                    End Date
                  </label>
                  <span className="text-xs text-gray-500">
                    {formatFullDate(dateRange.endDate)}
                  </span>
                </div>
                <Calendar
                  selectedDate={dateRange.endDate}
                  minDate={dateRange.startDate}
                  maxDate={new Date()}
                  onSelect={(date) => {
                    handleDateRangeChange({
                      ...dateRange,
                      endDate: date
                    });
                  }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between space-x-3">
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDatePicker(false);
                    onApply();
                  }}
                  className="flex-1 px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none"
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

export default TimePeriodSelector;