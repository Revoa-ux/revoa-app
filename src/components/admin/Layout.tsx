import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './Sidebar';

export default function AdminLayout() {
  const [isLargeScreen, setIsLargeScreen] = React.useState(true);
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    const saved = localStorage.getItem('adminSidebarCollapsed');
    if (saved !== null) return saved === 'true';
    return window.innerWidth >= 500 && window.innerWidth < 900;
  });

  React.useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      setIsLargeScreen(width >= 500);
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Listen to localStorage changes for sidebar collapse state
  React.useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('adminSidebarCollapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check for changes to localStorage from the same tab
    const interval = setInterval(() => {
      const saved = localStorage.getItem('adminSidebarCollapsed');
      if (saved !== null && (saved === 'true') !== isCollapsed) {
        setIsCollapsed(saved === 'true');
      }
    }, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [isCollapsed]);

  const effectiveCollapsed = isLargeScreen && isCollapsed;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      <AdminSidebar />
      <div className={`flex-1 transition-all duration-300 ease-in-out h-screen flex flex-col overflow-x-hidden ${
        isLargeScreen ? (effectiveCollapsed ? 'pl-[88px]' : 'pl-[298px]') : ''
      }`}>
        <div className="flex-1 w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 max-w-[1800px] mx-auto flex flex-col min-h-0 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}