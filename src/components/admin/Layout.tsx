import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './Sidebar';

export default function AdminLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <AdminSidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <div className="flex-1 lg:pl-[280px] w-full">
        <div className="max-w-[1050px] mx-auto p-4 sm:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}