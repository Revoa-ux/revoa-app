import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  MessageSquare,
  FileText,
  UserPlus,
  LogOut,
  Sun,
  Moon,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';

const mainNavigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: Home },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'Quote Requests', href: '/admin/quotes', icon: FileText },
  { name: 'Invoices', href: '/admin/invoices', icon: Receipt },
  { name: 'Conversations', href: '/admin/chat', icon: MessageSquare },
  { name: 'Manage Admins', href: '/admin/admins', icon: UserPlus, superAdminOnly: true }
];

const bottomNavigation = [
  { name: 'My Profile', href: '/admin/profile', icon: User },
  { name: 'Settings', href: '/admin/settings', icon: Settings }
];

export default function AdminSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isSuperAdmin, adminUser } = useAdmin();
  const { effectiveTheme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(true);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const isDarkMode = effectiveTheme === 'dark';

  const filteredMainNavigation = mainNavigation.filter(item =>
    !item.superAdminOnly || (item.superAdminOnly && isSuperAdmin)
  );

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };

  const getAdminInitials = () => {
    if (adminUser?.first_name && adminUser?.last_name) {
      return `${adminUser.first_name.charAt(0)}${adminUser.last_name.charAt(0)}`.toUpperCase();
    }
    if (adminUser?.name) {
      const nameParts = adminUser.name.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
      }
      return adminUser.name.substring(0, 2).toUpperCase();
    }
    if (adminUser?.email) {
      return adminUser.email.substring(0, 2).toUpperCase();
    }
    return 'AD';
  };

  const adminName = adminUser?.first_name && adminUser?.last_name
    ? `${adminUser.first_name} ${adminUser.last_name}`
    : adminUser?.name || adminUser?.email || 'Admin';
  const adminInitials = getAdminInitials();

  const effectiveCollapsed = !isLargeScreen || isCollapsed;

  return (
    <div className={`fixed inset-y-0 left-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out z-40 ${
      effectiveCollapsed ? 'w-[70px]' : 'w-[280px]'
    }`}>
      <div className="flex flex-col h-full">
        {/* Logo and Collapse Button */}
        {effectiveCollapsed ? (
          <div className="py-8 px-2 flex flex-col items-center gap-3">
            <div className="w-10 h-10 relative">
              <img
                src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
                alt="Logo"
                className="w-full h-full object-contain dark:invert dark:brightness-0 dark:contrast-200"
              />
            </div>
            {isLargeScreen && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                title="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
        ) : (
          <div className="py-8 px-4 flex items-center justify-between">
            <div className="w-32 h-8 relative overflow-hidden transition-all duration-300">
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
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        )}

        {/* Admin Profile Card */}
        {!effectiveCollapsed && (
          <div className="px-4 py-4">
            <div className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] flex items-center justify-center text-white font-semibold text-sm">
                  {adminInitials}
                </div>
                <div className="text-left">
                  <div className="text-base font-medium text-gray-900 dark:text-white">
                    {adminName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {isSuperAdmin ? 'Super Admin' : 'Admin'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {effectiveCollapsed && (
          <div className="px-2 py-4 flex justify-center">
            <div className="h-10 w-10 rounded-full bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] flex items-center justify-center text-white font-semibold text-sm">
              {adminInitials}
            </div>
          </div>
        )}

        {/* Main Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 border-y border-gray-100 dark:border-gray-700">
          <nav className="space-y-0.5">
            {filteredMainNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={effectiveCollapsed ? item.name : undefined}
                  className={cn(
                    'flex items-center rounded-lg transition-colors',
                    effectiveCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2',
                    'text-[13px]',
                    isActive
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  <Icon className={effectiveCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
                  {!effectiveCollapsed && item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Navigation */}
        <div className="px-3 py-4">
          <nav className="space-y-0.5">
            {bottomNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={effectiveCollapsed ? item.name : undefined}
                  className={cn(
                    'flex items-center text-[13px] rounded-lg transition-colors',
                    effectiveCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2',
                    isActive
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  <Icon className={effectiveCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
                  {!effectiveCollapsed && item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Dark Mode and Log Out */}
        <div className="p-3">
          <button
            onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
            title={effectiveCollapsed ? (isDarkMode ? 'Light Mode' : 'Dark Mode') : undefined}
            className={cn(
              'w-full flex items-center text-[13px] text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
              effectiveCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2'
            )}
          >
            {isDarkMode ? (
              <Sun className={effectiveCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
            ) : (
              <Moon className={effectiveCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
            )}
            {!effectiveCollapsed && (isDarkMode ? 'Light Mode' : 'Dark Mode')}
          </button>
          <button
            onClick={handleLogout}
            title={effectiveCollapsed ? 'Log Out' : undefined}
            className={cn(
              'w-full flex items-center text-[13px] text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors mt-0.5',
              effectiveCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2'
            )}
          >
            <LogOut className={effectiveCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
            {!effectiveCollapsed && 'Log Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
