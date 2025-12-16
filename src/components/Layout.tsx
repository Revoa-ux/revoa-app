import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowRightLeft,
  Wallet,
  Settings,
  Headphones,
  Sun,
  Moon,
  LogOut,
  MessageSquare,
  BarChart2,
  Sparkles,
  Mail,
  Package,
  ChevronLeft,
  ChevronRight,
  Table2,
  Database,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import Modal from './Modal';
import BottomSheet from './BottomSheet';
import { useConnectionStore, initializeConnections } from '../lib/connectionStore';
import { supabase } from '../lib/supabase';
import { startAutoSync } from '../lib/shopifyAutoSync';

const navigation = [
  { name: 'Analytics', href: '/', icon: BarChart2 },
  { name: 'My Quotes', href: '/quotes', icon: ArrowRightLeft },
  { name: 'Resolution Center', href: '/chat', icon: MessageSquare },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Wallet', href: '/balance', icon: Wallet },
  { name: 'Ad Manager', href: '/audit', icon: Table2, badge: 'AI' },
  { name: 'Pixel', href: '/pixel', icon: Database },
  { name: 'Automation', href: '/automation', icon: Cpu }
];

export default function Layout() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { effectiveTheme, setTheme } = useTheme();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    display_name?: string;
    first_name?: string;
    last_name?: string;
    store_type?: string;
  } | null>(null);

  const { shopify } = useConnectionStore();

  const isDarkMode = effectiveTheme === 'dark';

  useEffect(() => {
    if (!user?.id) return;

    const fetchUserProfile = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name, first_name, last_name, store_type')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && !error) {
        setUserProfile(data);
      }
    };

    fetchUserProfile();

    const subscription = supabase
      .channel('user_profile_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as any;
            setUserProfile({
              display_name: newData.display_name,
              first_name: newData.first_name,
              last_name: newData.last_name,
              store_type: newData.store_type
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  // Initialize connections when user is available
  useEffect(() => {
    if (!user?.id) {
      console.log('[Layout] No user, skipping initialization');
      return;
    }

    console.log('[Layout] Initializing connections for user:', user.id);

    const initConnections = async () => {
      const unsubscribe = await initializeConnections(user.id);
      return unsubscribe;
    };

    const unsubscribePromise = initConnections();

    // Start automatic Shopify order syncing
    const stopAutoSync = startAutoSync(user.id);

    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) {
          console.log('[Layout] Cleaning up subscriptions');
          unsubscribe();
        }
      });
      stopAutoSync();
    };
  }, [user?.id]);

  const shopifyStore = shopify.installation?.store_url?.replace('.myshopify.com', '') || null;

  const getDisplayName = () => {
    if (userProfile?.display_name) {
      return userProfile.display_name;
    }
    if (userProfile?.first_name || userProfile?.last_name) {
      return [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ');
    }
    return null;
  };

  const displayName = getDisplayName();

  const getInitials = () => {
    if (displayName) {
      const names = displayName.trim().split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
      }
      return names[0].charAt(0).toUpperCase();
    }
    if (shopifyStore) {
      return shopifyStore.charAt(0).toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };

  const renderSidebarContent = () => (
    <>
      {/* Logo and Collapse Button - Desktop Only */}
      {isCollapsed ? (
        <div className="hidden lg:flex py-8 px-2 flex-col items-center gap-3">
          <div className="w-10 h-10 relative">
            <img
              src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
              alt="Logo"
              className="w-full h-full object-contain dark:invert dark:brightness-0 dark:contrast-200"
            />
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      ) : (
        <div className="hidden lg:flex py-8 px-4 items-center justify-between">
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

      {/* Main Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 pt-6 lg:pt-4 border-b lg:border-y border-gray-100 dark:border-gray-700">
        <nav className="space-y-1 lg:space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            const hasBadge = 'badge' in item && item.badge;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  'flex items-center rounded-lg transition-all',
                  isCollapsed ? 'justify-center px-3 py-2' : 'justify-between px-3 py-3 lg:py-2',
                  'text-[13px]',
                  isActive
                    ? 'bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 text-gray-900 dark:text-white font-medium shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                {isCollapsed ? (
                  <div className="relative">
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                    {hasBadge && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full" />
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center">
                      <Icon className="mr-2.5 h-4 w-4" strokeWidth={1.5} />
                      {item.name}
                    </div>
                    {hasBadge && (
                      <span className="px-2 py-0.5 text-[9px] font-normal bg-red-500/15 text-red-600 dark:text-red-400 rounded-full whitespace-nowrap backdrop-blur-sm">
                        Revoa AI
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Navigation Group - Desktop Only */}
      <div className="hidden lg:block px-3 py-3 border-t border-gray-100 dark:border-gray-700">
        <nav className="space-y-0.5">
          <Link
            to="/settings"
            onClick={() => setIsMobileMenuOpen(false)}
            title={isCollapsed ? 'Settings' : undefined}
            className={cn(
              'flex items-center text-[13px] rounded-lg transition-all',
              isCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2',
              location.pathname === '/settings'
                ? 'bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 text-gray-900 dark:text-white font-medium shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
          >
            <Settings className={isCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
            {!isCollapsed && 'Settings'}
          </Link>
          <Link
            to="/pricing"
            onClick={() => setIsMobileMenuOpen(false)}
            title={isCollapsed ? 'Plans and Pricing' : undefined}
            className={cn(
              'flex items-center text-[13px] rounded-lg transition-all',
              isCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2',
              location.pathname === '/pricing'
                ? 'bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 text-gray-900 dark:text-white font-medium shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
          >
            <Sparkles className={isCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
            {!isCollapsed && 'Plans and Pricing'}
          </Link>
          <button
            onClick={() => setShowHelpModal(true)}
            title={isCollapsed ? 'Help & Support' : undefined}
            className={cn(
              'w-full flex items-center text-[13px] text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
              isCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2'
            )}
          >
            <Headphones className={isCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
            {!isCollapsed && 'Help & Support'}
          </button>
          <button
            onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
            title={isCollapsed ? (isDarkMode ? 'Light Mode' : 'Dark Mode') : undefined}
            className={cn(
              'w-full flex items-center text-[13px] text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
              isCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2'
            )}
          >
            {isDarkMode ? (
              <Sun className={isCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
            ) : (
              <Moon className={isCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
            )}
            {!isCollapsed && (isDarkMode ? 'Light Mode' : 'Dark Mode')}
          </button>
          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Log Out' : undefined}
            className={cn(
              'w-full flex items-center text-[13px] text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
              isCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2'
            )}
          >
            <LogOut className={isCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
            {!isCollapsed && 'Log Out'}
          </button>
        </nav>
      </div>

      {/* Account Profile - Bottom */}
      {!isCollapsed && (
        <div className="px-3 py-4 lg:py-3 border-t border-gray-100 dark:border-gray-700">
          {/* Desktop Profile Card */}
          <Link
            to="/settings"
            onClick={() => setIsMobileMenuOpen(false)}
            className="hidden lg:flex w-full items-center p-2.5 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 hover:shadow-md rounded-xl transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-full bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] flex items-center justify-center text-white font-semibold text-sm">
                {getInitials()}
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {displayName || user?.email || 'Your Account'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {shopifyStore ? `${shopifyStore}.myshopify.com` : 'No store connected'}
                </div>
              </div>
            </div>
          </Link>

          {/* Mobile Profile Card with Action Buttons */}
          <div className="lg:hidden w-full flex items-center justify-between p-3 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 rounded-xl">
            <Link
              to="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center space-x-3 min-w-0 flex-1"
            >
              <div className="h-9 w-9 rounded-full bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {getInitials()}
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {displayName || user?.email || 'Your Account'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {shopifyStore ? `${shopifyStore}.myshopify.com` : 'No store connected'}
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-2 ml-2">
              <Link
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
              </Link>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title="Log Out"
              >
                <LogOut className="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      )}
      {isCollapsed && (
        <div className="px-2 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-center">
          <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} title="Account Settings">
            <div className="h-9 w-9 rounded-full bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] flex items-center justify-center text-white font-semibold text-sm hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all">
              {getInitials()}
            </div>
          </Link>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Desktop sidebar - hidden on mobile */}
      <div className={`hidden lg:block fixed inset-y-0 left-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out z-50 ${
        isCollapsed ? 'w-[70px]' : 'w-[280px]'
      }`}>
        <div className="flex flex-col h-full">
          {renderSidebarContent()}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <BottomSheet isOpen={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <div className="flex flex-col h-full overflow-y-auto">
          {renderSidebarContent()}
        </div>
      </BottomSheet>

      {/* Main content area */}
      <div className={`flex-1 transition-all duration-300 ease-in-out h-screen flex flex-col overflow-x-hidden ${
        isCollapsed ? 'lg:pl-[70px]' : 'lg:pl-[280px]'
      }`}>
        <div className={`flex-1 w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 max-w-[1800px] mx-auto flex flex-col min-h-0 overflow-x-hidden ${
          location.pathname === '/audit' ? 'overflow-y-hidden' : 'overflow-y-auto'
        }`}>
          <Outlet />
        </div>
      </div>

      {/* Help & Support Modal */}
      {showHelpModal && (
        <Modal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
          title="Help & Support"
        >
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-primary-500 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Contact Support</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Our support team is here to help! Send us an email and we'll get back to you as soon as possible.
              </p>
              <a
                href="mailto:help@revoa.app"
                className="group inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-gray-800 dark:bg-gray-600 border border-gray-700 dark:border-gray-500 rounded-lg hover:bg-gray-900 dark:hover:bg-gray-700 hover:shadow-md transition-all"
              >
                <Mail className="w-4 h-4" />
                <span>help@revoa.app</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Support Hours</h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>Monday - Friday: 9:00 AM - 6:00 PM EST</p>
                <p>Saturday - Sunday: 10:00 AM - 4:00 PM EST</p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Response Time</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We typically respond to all inquiries within 24 hours during business days.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
