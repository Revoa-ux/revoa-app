import React from 'react';
import { Shield } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';

const AdminManage: React.FC = () => {
  const { isSuperAdmin } = useAdmin();

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Shield className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Only super admins can access this page</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage admin users and permissions</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Admin management interface coming soon</p>
        </div>
      </div>
    </div>
  );
};

export default AdminManage;
