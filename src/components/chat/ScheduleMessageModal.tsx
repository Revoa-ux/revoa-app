import React, { useState } from 'react';
import { X, Calendar, Clock, Send } from 'lucide-react';
import { toast } from '../../lib/toast';

interface ScheduleMessageModalProps {
  message: string;
  onClose: () => void;
  onSchedule: (scheduledTime: Date) => void;
}

export const ScheduleMessageModal: React.FC<ScheduleMessageModalProps> = ({
  message,
  onClose,
  onSchedule
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    })
  );

  const handleSchedule = () => {
    const scheduledTime = new Date(`${selectedDate}T${selectedTime}`);
    
    if (scheduledTime < new Date()) {
      toast.error('Please select a future date and time');
      return;
    }

    onSchedule(scheduledTime);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Schedule Message</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-2">Message Preview</div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{message || 'No message content'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Time
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              disabled={!message.trim()}
              className="btn btn-primary flex items-center gap-2"
            >
              <Send className="w-4 h-4 btn-icon" />
              Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
