import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './Sidebar';

export default function AdminLayout() {
  const [sidebarWidth, setSidebarWidth] = React.useState('280px');

  React.useEffect(() => {
    const updateSidebarWidth = () => {
      const width = window.innerWidth;
      if (width < 500) {
        setSidebarWidth('0px'); // Bottom sheet, no padding
      } else if (width < 900) {
        setSidebarWidth('70px'); // Collapsed sidebar
      } else {
        setSidebarWidth('280px'); // Full sidebar (unless manually collapsed)
      }
    };

    updateSidebarWidth();
    window.addEventListener('resize', updateSidebarWidth);
    return () => window.removeEventListener('resize', updateSidebarWidth);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <AdminSidebar />
      <div className="flex-1 w-full" style={{ paddingLeft: sidebarWidth }}>
        <div className="max-w-[1050px] mx-auto p-4 sm:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}