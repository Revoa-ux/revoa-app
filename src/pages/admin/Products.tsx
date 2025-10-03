import React from 'react';
import { Package } from 'lucide-react';

const AdminProducts: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage product catalog and approvals</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No products to manage</p>
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;
