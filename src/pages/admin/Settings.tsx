import React, { useState } from 'react';
import {
  Users,
  MessageSquare,
  BarChart3,
  UserPlus,
  Clock,
  Calendar,
  Mail,
  FileText,
  Settings as SettingsIcon,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';

export default function AdminSettings() {
  useAdmin();
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
        <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-2">
          Admin Settings
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure your admin preferences
          </p>
        </div>
      </div>

      {/* Canva OAuth Setup */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-700 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-lg">
              <Palette className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                Canva OAuth Setup
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Enable unlimited background removal + 2x upscaling for product images
              </p>
              <button
                onClick={() => {
                  const width = 600;
                  const height = 700;
                  const left = (window.innerWidth - width) / 2;
                  const top = (window.innerHeight - height) / 2;
                  window.open(
                    '/canva-oauth-setup.html',
                    'canva-oauth',
                    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
                  );
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                🚀 Setup Canva OAuth
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Notifications</h2>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <UserPlus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">New User Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when new users sign up</p>
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
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Message Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get notified of new user messages</p>
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
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Quote Request Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get notified of new quote requests</p>
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
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">User Assignment</h2>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Auto-Assign Users</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Automatically assign new users</p>
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
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <SettingsIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Load Balancing</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Distribute users evenly</p>
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
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Communication</h2>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Auto-Response</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Send automatic responses</p>
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
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Follow-up Reminders</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get reminders for follow-ups</p>
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
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Reporting</h2>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Daily Digest</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive daily activity summary</p>
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
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Performance Reports</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Weekly performance metrics</p>
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