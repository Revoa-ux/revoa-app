import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  MessageSquare,
  FileText,
  Package,
  Settings,
  UserPlus,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { toast } from 'sonner';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: Home },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'Quote Requests', href: '/admin/quotes', icon: FileText },
  { name: 'Conversations', href: '/admin/chat', icon: MessageSquare },
  { name: 'Product Approvals', href: '/admin/products', icon: Package, superAdminOnly: true },
  { name: 'Bulk Invoices', href: '/admin/invoices', icon: FileText },
  { name: 'Manage Admins', href: '/admin/admins', icon: UserPlus, superAdminOnly: true },
  { name: 'Settings', href: '/admin/settings', icon: Settings }
];

export default function AdminSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isSuperAdmin } = useAdmin();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('color-theme');
    if (stored) {
      return stored === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
      localStorage.setItem('color-theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('color-theme', 'light');
    }
  }, [isDarkMode]);

  const filteredNavigation = navigation.filter(item => 
    !item.superAdminOnly || (item.superAdminOnly && isSuperAdmin)
  );

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Successfully logged out');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };

  return (
    <div className="w-[280px] fixed inset-y-0 left-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="py-8 px-4">
          <div className="w-32 h-8 relative">
            <img
              src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Logo%20Black.png"
              alt="Logo"
              className="w-full h-full object-contain dark:hidden"
            />
            <img
              src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Logo%20White.png"
              alt="Logo"
              className="w-full h-full object-contain hidden dark:block"
            />
          </div>
        </div>

        {/* Main Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-0.5">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 text-[13px] rounded-lg transition-colors',
                    isActive
                      ? 'bg-gray-900 text-white dark:bg-gray-600 dark:text-white font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  <Icon className="mr-2.5 h-4 w-4" strokeWidth={1.5} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Dark Mode and Log Out */}
        <div className="p-3">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center px-3 py-2 text-[13px] text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {isDarkMode ? (
              <Sun className="mr-2.5 h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Moon className="mr-2.5 h-4 w-4" strokeWidth={1.5} />
            )}
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 mt-0.5 text-[13px] text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <LogOut className="mr-2.5 h-4 w-4" strokeWidth={1.5} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}