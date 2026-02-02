import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface CalendarProps {
  selectedDate: Date;
  minDate?: Date;
  maxDate?: Date;
  onSelect: (date: Date) => void;
  startDate?: Date;
  endDate?: Date;
}

const Calendar: React.FC<CalendarProps> = ({
  selectedDate,
  minDate,
  maxDate,
  onSelect,
  startDate,
  endDate
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Previous month days
    const prevMonthDays = firstDayOfMonth;
    const prevMonth = new Date(year, month, 0);
    const prevMonthLastDay = prevMonth.getDate();

    for (let i = prevMonthDays - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth);

  const isDateDisabled = (date: Date) => {
    if (minDate && date < new Date(minDate.setHours(0, 0, 0, 0))) return true;
    if (maxDate && date > new Date(maxDate.setHours(23, 59, 59, 999))) return true;
    return false;
  };

  const isInRange = (date: Date) => {
    if (!startDate || !endDate) return false;
    const dateTime = date.getTime();
    const startTime = new Date(startDate).setHours(0, 0, 0, 0);
    const endTime = new Date(endDate).setHours(23, 59, 59, 999);
    return dateTime >= startTime && dateTime <= endTime;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  return (
    <div className="p-3 bg-white dark:bg-dark rounded-lg w-full max-w-full">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-1 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors focus:outline-none"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <div className="text-lg font-semibold text-gray-900 dark:text-white">
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button
          onClick={handleNextMonth}
          className="p-1 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors focus:outline-none"
        >
          <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {DAYS.map(day => (
          <div
            key={day}
            className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-1.5"
          >
            {day}
          </div>
        ))}
        {days.map(({ date, isCurrentMonth }, index) => {
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const isDisabled = isDateDisabled(date);
          const isToday = date.toDateString() === new Date().toDateString();
          const inRange = isInRange(date);

          return (
            <button
              key={index}
              onClick={() => !isDisabled && onSelect(date)}
              disabled={isDisabled}
              className={`
                text-xs sm:text-sm p-1.5 sm:p-2.5 rounded-lg transition-all relative focus:outline-none font-medium
                ${isSelected ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-md' :
                  inRange ? 'bg-gray-700/50 dark:bg-[#3a3a3a]/70 text-gray-900 dark:text-gray-100' :
                  isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-[#3a3a3a]'}
                ${isToday && !isSelected && !inRange ? 'ring-1 ring-rose-500/50' : ''}
              `}
            >
              {date.getDate()}
              {isToday && !isSelected && !inRange && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-rose-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
