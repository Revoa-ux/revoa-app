import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowRightLeft,
  Wallet,
  Settings,
  Sun,
  Moon,
  LogOut,
  MessageSquare,
  BarChart2,
  LifeBuoy,
  Package,
  PanelLeft,
  PanelRight,
  Table2,
  Database,
  Cpu,
  ArrowRight,
  Gem
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const BRAND_GRADIENT = 'linear-gradient(135deg, #E11D48 0%, #EC4899 40%, #F87171 70%, #E8795A 100%)';
import { toast } from '../lib/toast';
import Modal from './Modal';
import BottomSheet from './BottomSheet';
import { useConnectionStore, initializeConnections } from '../lib/connectionStore';
import { supabase } from '../lib/supabase';
import { startAutoSync } from '../lib/shopifyAutoSync';
import { PendingPaymentBanner } from './balance/PendingPaymentBanner';
import { useSubscription } from '../contexts/SubscriptionContext';

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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load from localStorage or auto-collapse based on screen size
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) return saved === 'true';
    return window.innerWidth >= 500 && window.innerWidth < 900;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [userProfile, setUserProfile] = useState<{
    display_name?: string;
    first_name?: string;
    last_name?: string;
    store_type?: string;
  } | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const { shopify } = useConnectionStore();

  const isDarkMode = effectiveTheme === 'dark';

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Handle responsive breakpoints
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

  // Track unread messages for notification badge
  useEffect(() => {
    if (!user?.id) return;

    const fetchUnreadCount = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('unread_count_user')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (data && !error) {
        const totalUnread = data.reduce((sum, chat) => sum + (chat.unread_count_user || 0), 0);
        setUnreadMessageCount(totalUnread);
      }
    };

    fetchUnreadCount();

    const subscription = supabase
      .channel('unread_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCount();
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

  const shopifyStore = shopify.installation?.store_url?.replace('https://', '').replace('.myshopify.com', '') || null;

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
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            const hasBadge = 'badge' in item && item.badge;
            const hasUnreadMessages = item.href === '/chat' && unreadMessageCount > 0;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                title={effectiveCollapsed ? item.name : undefined}
                className={cn(
                  'flex items-center rounded-lg',
                  effectiveCollapsed ? 'justify-center px-3 py-2' : 'justify-between px-3 py-2',
                  'text-[13px]',
                  isActive
                    ? 'bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200/60 dark:border-[#3a3a3a]/60 text-gray-900 dark:text-white font-medium shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors duration-150'
                )}
              >
                {effectiveCollapsed ? (
                  <div className="relative">
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                    {hasUnreadMessages && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-white dark:ring-gray-800" style={{ background: BRAND_GRADIENT }} />
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center">
                      <div className="relative mr-2.5">
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                        {hasUnreadMessages && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full ring-1 ring-white dark:ring-gray-800" style={{ background: BRAND_GRADIENT }} />
                        )}
                      </div>
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

      {/* Bottom Navigation Group */}
      {isLargeScreen && (
        <div className="px-3 py-3 border-t border-gray-100/50 dark:border-[#3a3a3a]/50">
        <nav className="space-y-0.5">
          <button
            onClick={() => setShowHelpModal(true)}
            title={effectiveCollapsed ? 'Help' : undefined}
            className={cn(
              'w-full flex items-center text-[13px] text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors',
              effectiveCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2'
            )}
          >
            <LifeBuoy className={effectiveCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
            {!effectiveCollapsed && 'Help'}
          </button>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              const storeUrl = shopify.installation?.store_url;
              if (storeUrl) {
                const shopName = storeUrl.replace('.myshopify.com', '').replace('https://', '').replace('http://', '');
                window.open(`https://admin.shopify.com/store/${shopName}/charges/revoa/pricing_plans`, '_blank');
              } else {
                toast.error('Please connect your Shopify store first');
              }
            }}
            title={effectiveCollapsed ? 'Subscription' : undefined}
            className={cn(
              'w-full flex items-center text-[13px] rounded-lg',
              effectiveCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2',
              'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors duration-150'
            )}
          >
            <Gem className={effectiveCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
            {!effectiveCollapsed && 'Subscription'}
          </button>
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

      {/* Account Profile - Bottom */}
      {!effectiveCollapsed && (
        <div className="px-3 py-4 border-t border-gray-100/50 dark:border-[#3a3a3a]/50">
          {/* Desktop Profile Card */}
          {isLargeScreen && (
            <div className="flex w-full items-center justify-between p-2.5 bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200/60 dark:border-[#3a3a3a]/60 rounded-xl">
              <Link
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center space-x-3 min-w-0 flex-1 hover:opacity-80 transition-opacity"
              >
                <div className="h-9 w-9 rounded-full bg-[linear-gradient(135deg,#E11D48_0%,#EC4899_40%,#F87171_70%,#E8795A_100%)] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
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
              <Link
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors ml-2"
                title="Settings"
              >
                <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
              </Link>
            </div>
          )}

          {/* Mobile Profile Card with Action Buttons */}
          {!isLargeScreen && (
            <div className="w-full flex items-center justify-between p-3 bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200/60 dark:border-[#3a3a3a]/60 rounded-xl">
            <Link
              to="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center space-x-3 min-w-0 flex-1"
            >
              <div className="h-9 w-9 rounded-full bg-[linear-gradient(135deg,#E11D48_0%,#EC4899_40%,#F87171_70%,#E8795A_100%)] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
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
                className="p-2.5 hover:bg-gray-200 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
              </Link>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="p-2.5 hover:bg-gray-200 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors"
                title="Log Out"
              >
                <LogOut className="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
              </button>
            </div>
            </div>
          )}
        </div>
      )}
      {effectiveCollapsed && isLargeScreen && (
        <div className="px-2 py-3 border-t border-gray-100/50 dark:border-[#3a3a3a]/50 flex justify-center">
          <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} title="Account Settings">
            <div className="h-9 w-9 rounded-full bg-[linear-gradient(135deg,#E11D48_0%,#EC4899_40%,#F87171_70%,#E8795A_100%)] flex items-center justify-center text-white font-semibold text-sm hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all">
              {getInitials()}
            </div>
          </Link>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Sidebar - visible from 500px and up */}
      {isLargeScreen && (
        <div className={`fixed top-3 bottom-3 left-3 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl transition-all duration-300 ease-in-out z-50 ${
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

      {/* Main content area */}
      <div className={`flex-1 transition-all duration-300 ease-in-out h-screen flex flex-col overflow-x-hidden ${
        isLargeScreen ? (effectiveCollapsed ? 'pl-[88px]' : 'pl-[298px]') : ''
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
              <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm mx-auto mb-4" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: '#3B82F6',
                    boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                  }}
                >
                  <LifeBuoy className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Contact Support</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Our support team is here to help! Send us an email and we'll get back to you as soon as possible.
              </p>
              <a
                href="mailto:help@revoa.app"
                className="btn btn-primary"
              >
                <span>help@revoa.app</span>
                <ArrowRight className="btn-icon btn-icon-arrow" />
              </a>
            </div>

            <div className="border-t border-gray-200 dark:border-[#3a3a3a] pt-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Support Hours</h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>Monday - Friday: 9:00 AM - 6:00 PM EST</p>
                <p>Saturday - Sunday: 10:00 AM - 4:00 PM EST</p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-[#3a3a3a] pt-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Response Time</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We typically respond to all inquiries within 24 hours during business days.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Banners */}
      <PendingPaymentBanner />
    </div>
  );
}
