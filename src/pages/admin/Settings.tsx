import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const AdminSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Configure system-wide settings</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <SettingsIcon className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Settings configuration coming soon</p>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
