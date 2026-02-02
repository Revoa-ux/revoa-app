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
  PanelLeft,
  PanelRight,
  Receipt,
  Truck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from '../../lib/toast';
import BottomSheet from '../BottomSheet';

const mainNavigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: Home },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'Quote Requests', href: '/admin/quotes', icon: FileText },
  { name: 'Order Fulfillment', href: '/admin/orders', icon: Truck },
  { name: 'Resolution Center', href: '/admin/chat', icon: MessageSquare },
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load from localStorage or auto-collapse based on screen size
    const saved = localStorage.getItem('adminSidebarCollapsed');
    if (saved !== null) return saved === 'true';
    return window.innerWidth >= 500 && window.innerWidth < 900;
  });
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setScreenWidth(width);

      // Above 500px: sidebar visible
      // Below 500px: bottom sheet only
      setIsLargeScreen(width >= 500);
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

  const effectiveCollapsed = isLargeScreen && isCollapsed;

  const renderSidebarContent = () => (
    <>
      {/* Logo and Collapse Button - Only show on desktop */}
      {isLargeScreen && (
        effectiveCollapsed ? (
          <div className="py-5 px-2 flex flex-col items-center gap-2 relative z-10">
            <div className="w-10 h-10 relative">
              <img
                src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
                alt="Logo"
                className="w-full h-full object-contain dark:invert dark:brightness-0 dark:contrast-200"
              />
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3a3a3a] transition-colors relative z-10"
              title="Expand sidebar"
            >
              <PanelRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        ) : (
          <div className="py-5 px-4 flex items-center justify-between">
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
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3a3a3a] transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        )
      )}

      {/* Main Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 pt-2 border-t border-gray-100/50 dark:border-[#3a3a3a]/50">
        <nav className="space-y-0.5">
          {filteredMainNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                title={effectiveCollapsed ? item.name : undefined}
                className={cn(
                  'flex items-center rounded-lg',
                  effectiveCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2',
                  'text-[13px]',
                  isActive
                    ? 'bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200/60 dark:border-[#3a3a3a]/60 text-gray-900 dark:text-white font-medium shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors duration-150'
                )}
              >
                <Icon className={effectiveCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
                {!effectiveCollapsed && item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Navigation - Only on desktop */}
      {isLargeScreen && (
        <div className="px-3 py-3 border-t border-gray-100/50 dark:border-[#3a3a3a]/50">
          <nav className="space-y-0.5">
            {bottomNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  title={effectiveCollapsed ? item.name : undefined}
                  className={cn(
                    'flex items-center text-[13px] rounded-lg',
                    effectiveCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2',
                    isActive
                      ? 'bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200/60 dark:border-[#3a3a3a]/60 text-gray-900 dark:text-white font-medium shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors duration-150'
                  )}
                >
                  <Icon className={effectiveCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
                  {!effectiveCollapsed && item.name}
                </Link>
              );
            })}
            <button
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              title={effectiveCollapsed ? (isDarkMode ? 'Light Mode' : 'Dark Mode') : undefined}
              className={cn(
                'w-full flex items-center text-[13px] text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors',
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
                'w-full flex items-center text-[13px] text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors',
                effectiveCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2'
              )}
            >
              <LogOut className={effectiveCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
              {!effectiveCollapsed && 'Log Out'}
            </button>
          </nav>
        </div>
      )}

      {/* Admin Profile - Bottom */}
      {!effectiveCollapsed && (
        <div className="px-3 py-4 border-t border-gray-100/50 dark:border-[#3a3a3a]/50">
          {/* Desktop Profile Card */}
          {isLargeScreen && (
            <Link
              to="/admin/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex w-full items-center p-2.5 bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200/60 dark:border-[#3a3a3a]/60 hover:shadow-md rounded-xl transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-full bg-[linear-gradient(135deg,#E11D48_0%,#EC4899_40%,#F87171_70%,#E8795A_100%)] flex items-center justify-center text-white font-semibold text-sm">
                  {adminInitials}
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {adminName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {isSuperAdmin ? 'Super Admin' : 'Admin'}
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Mobile Profile Card with Action Buttons */}
          {!isLargeScreen && (
            <div className="space-y-2">
              <div className="w-full flex items-center justify-between p-3 bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200/60 dark:border-[#3a3a3a]/60 rounded-xl">
                <Link
                  to="/admin/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-3 min-w-0 flex-1"
                >
                  <div className="h-9 w-9 rounded-full bg-[linear-gradient(135deg,#E11D48_0%,#EC4899_40%,#F87171_70%,#E8795A_100%)] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {adminInitials}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {adminName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {isSuperAdmin ? 'Super Admin' : 'Admin'}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors flex-shrink-0"
                  title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                >
                  {isDarkMode ? (
                    <Sun className="w-4 h-4 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
                  ) : (
                    <Moon className="w-4 h-4 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors flex-shrink-0"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed state - Show avatar */}
      {effectiveCollapsed && (
        <div className="px-2 py-4 border-t border-gray-100/50 dark:border-[#3a3a3a]/50 flex justify-center">
          <Link to="/admin/profile" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="h-9 w-9 rounded-full bg-[linear-gradient(135deg,#E11D48_0%,#EC4899_40%,#F87171_70%,#E8795A_100%)] flex items-center justify-center text-white font-semibold text-sm hover:ring-2 ring-gray-200 dark:ring-[#3a3a3a] transition-all">
              {adminInitials}
            </div>
          </Link>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar - visible from 500px and up */}
      {isLargeScreen && (
        <div className={`fixed top-3 bottom-3 left-3 bg-white dark:bg-dark border border-gray-200 dark:border-[#2a2a2a] rounded-2xl transition-all duration-300 ease-in-out z-50 ${
          effectiveCollapsed ? 'w-[70px]' : 'w-[280px]'
        }`}>
          <div className="flex flex-col h-full">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Mobile bottom sheet - only below 500px */}
      {!isLargeScreen && (
        <BottomSheet isOpen={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <div className="flex flex-col h-full overflow-y-auto">
            {renderSidebarContent()}
          </div>
        </BottomSheet>
      )}
    </>
  );
}
