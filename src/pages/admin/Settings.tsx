import React, { useState } from 'react';
import { 
  Bell, 
  Users,
  MessageSquare,
  BarChart3,
  UserPlus,
  Clock,
  Calendar,
  ChevronDown,
  Check,
  Mail,
  FileText,
  Settings as SettingsIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';

export default function AdminSettings() {
  const { isAdmin } = useAdmin();
  const [settings, setSettings] = useState({
    notifications: {
      newUsers: true,
      userMessages: true,
      quoteRequests: true,
      dailyReports: true
    },
    userAssignment: {
      autoAssign: true,
      maxUsers: 150,
      balanceLoad: true
    },
    communication: {
      autoResponse: true,
      responseTemplates: true,
      followUpReminders: true
    },
    reporting: {
      dailyDigest: true,
      weeklyPerformance: true,
      monthlyMetrics: true
    }
  });

  const handleSettingChange = async (category: string, setting: string, value: boolean) => {
    try {
      setSettings(prev => ({
        ...prev,
        [category]: {
          ...prev[category as keyof typeof prev],
          [setting]: value
        }
      }));
      
      toast.success('Setting updated successfully');
    } catch (error) {
      toast.error('Failed to update setting');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 mb-2">
          Admin Settings
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500">
            Configure your admin preferences
          </p>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <UserPlus className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">New User Notifications</h3>
                  <p className="text-sm text-gray-500">Get notified when new users sign up</p>
                </div>
              </div>
              <button
                onClick={() => handleSettingChange('notifications', 'newUsers', !settings.notifications.newUsers)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.newUsers ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.newUsers ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Message Notifications</h3>
                  <p className="text-sm text-gray-500">Get notified of new user messages</p>
                </div>
              </div>
              <button
                onClick={() => handleSettingChange('notifications', 'userMessages', !settings.notifications.userMessages)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.userMessages ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.userMessages ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Quote Request Notifications</h3>
                  <p className="text-sm text-gray-500">Get notified of new quote requests</p>
                </div>
              </div>
              <button
                onClick={() => handleSettingChange('notifications', 'quoteRequests', !settings.notifications.quoteRequests)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.quoteRequests ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.quoteRequests ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Assignment Settings */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">User Assignment</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Users className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Auto-Assign Users</h3>
                  <p className="text-sm text-gray-500">Automatically assign new users</p>
                </div>
              </div>
              <button
                onClick={() => handleSettingChange('userAssignment', 'autoAssign', !settings.userAssignment.autoAssign)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.userAssignment.autoAssign ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.userAssignment.autoAssign ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <SettingsIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Load Balancing</h3>
                  <p className="text-sm text-gray-500">Distribute users evenly</p>
                </div>
              </div>
              <button
                onClick={() => handleSettingChange('userAssignment', 'balanceLoad', !settings.userAssignment.balanceLoad)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.userAssignment.balanceLoad ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.userAssignment.balanceLoad ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Communication Settings */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Communication</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Auto-Response</h3>
                  <p className="text-sm text-gray-500">Send automatic responses</p>
                </div>
              </div>
              <button
                onClick={() => handleSettingChange('communication', 'autoResponse', !settings.communication.autoResponse)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.communication.autoResponse ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.communication.autoResponse ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Follow-up Reminders</h3>
                  <p className="text-sm text-gray-500">Get reminders for follow-ups</p>
                </div>
              </div>
              <button
                onClick={() => handleSettingChange('communication', 'followUpReminders', !settings.communication.followUpReminders)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.communication.followUpReminders ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.communication.followUpReminders ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reporting Settings */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Reporting</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Daily Digest</h3>
                  <p className="text-sm text-gray-500">Receive daily activity summary</p>
                </div>
              </div>
              <button
                onClick={() => handleSettingChange('reporting', 'dailyDigest', !settings.reporting.dailyDigest)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.reporting.dailyDigest ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.reporting.dailyDigest ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Performance Reports</h3>
                  <p className="text-sm text-gray-500">Weekly performance metrics</p>
                </div>
              </div>
              <button
                onClick={() => handleSettingChange('reporting', 'weeklyPerformance', !settings.reporting.weeklyPerformance)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.reporting.weeklyPerformance ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.reporting.weeklyPerformance ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}