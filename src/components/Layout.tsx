import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Home,
  ArrowRightLeft,
  Wallet,
  Settings,
  Headphones,
  Sun,
  Moon,
  LogOut,
  MessageSquare,
  LayoutGrid,
  Calculator,
  BarChart3,
  CreditCard,
  Mail,
  Package,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import Modal from './Modal';
import { getShopifyAccessToken } from '../lib/shopify/api';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Find Products', href: '/products', icon: LayoutGrid },
  { name: 'Get Quotes', href: '/quotes', icon: ArrowRightLeft },
  { name: 'Supplier Chat', href: '/chat', icon: MessageSquare },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Balance', href: '/balance', icon: Wallet },
  { name: 'Ad Reports', href: '/audit', icon: BarChart3 },
  { name: 'Calculator', href: '/calculator', icon: Calculator },
  { name: 'Pricing', href: '/pricing', icon: CreditCard }
];

export default function Layout() {
  const location = useLocation();
  const { signOut } = useAuth();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [shopifyStore, setShopifyStore] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage first, then system preference
    const stored = localStorage.getItem('color-theme');
    if (stored) {
      return stored === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply dark mode class to html element
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

  // Fetch Shopify store name
  useEffect(() => {
    const fetchShopifyStore = async () => {
      try {
        console.log('[Layout] Starting to fetch Shopify store...');
        const auth = await getShopifyAccessToken();
        console.log('[Layout] getShopifyAccessToken returned:', auth);

        if (auth?.shop) {
          // Remove .myshopify.com and format nicely
          const storeName = auth.shop.replace('.myshopify.com', '');
          setShopifyStore(storeName);
          console.log('[Layout] Shopify store loaded:', storeName);
        } else {
          console.warn('[Layout] No shop found in auth response');
        }
      } catch (error) {
        console.error('[Layout] Error fetching Shopify store:', error);
      }
    };

    // Add a small delay to ensure auth is ready
    const timer = setTimeout(() => {
      fetchShopifyStore();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Fixed width sidebar */}
      <div className={`fixed inset-y-0 left-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[70px]' : 'w-[280px]'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo and Collapse Button */}
          <div className="py-8 px-4 flex items-center justify-between">
            <div className={`transition-all duration-300 ${isCollapsed ? 'w-8 h-8' : 'w-32 h-8'} relative overflow-hidden`}>
              {isCollapsed ? (
                <img
                  src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <>
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
                </>
              )}
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all ${
                isCollapsed ? 'ml-0' : 'ml-2'
              }`}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>

          {/* Account Selector */}
          {!isCollapsed && (
            <div className="px-4 py-4">
              <button className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] flex items-center justify-center text-white font-semibold text-lg">
                    {shopifyStore ? shopifyStore.charAt(0).toUpperCase() : 'Y'}
                  </div>
                  <div className="text-left">
                    <div className="text-base font-medium text-gray-900 dark:text-white">
                      {shopifyStore || 'Your Store'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {shopifyStore ? `${shopifyStore}.myshopify.com` : 'No store connected'}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}
          {isCollapsed && (
            <div className="px-2 py-4 flex justify-center">
              <div className="h-10 w-10 rounded-full bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] flex items-center justify-center text-white font-semibold text-lg">
                {shopifyStore ? shopifyStore.charAt(0).toUpperCase() : 'Y'}
              </div>
            </div>
          )}

          {/* Main Menu */}
          <div className="flex-1 overflow-y-auto px-3 py-4 border-y border-gray-100 dark:border-gray-700">
            <nav className="space-y-0.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                const isComingSoon = item.name === 'Find Products';
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    title={isCollapsed ? item.name : undefined}
                    className={cn(
                      'flex items-center rounded-lg transition-colors',
                      isCollapsed ? 'justify-center px-3 py-2' : 'justify-between px-3 py-2',
                      'text-[13px]',
                      isActive
                        ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    )}
                  >
                    {isCollapsed ? (
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    ) : (
                      <>
                        <div className="flex items-center">
                          <Icon className="mr-2.5 h-4 w-4" strokeWidth={1.5} />
                          {item.name}
                        </div>
                        {isComingSoon && (
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full whitespace-nowrap">
                            Coming Soon
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Preferences */}
          <div className="px-3 py-4">
            <nav className="space-y-0.5">
              <Link
                to="/settings"
                title={isCollapsed ? 'Settings' : undefined}
                className={cn(
                  'flex items-center text-[13px] rounded-lg transition-colors',
                  isCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2',
                  location.pathname === '/settings'
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                <Settings className={isCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
                {!isCollapsed && 'Settings'}
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
            </nav>
          </div>

          {/* Dark Mode and Log Out */}
          <div className="p-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
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
                'w-full flex items-center mt-0.5 text-[13px] text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                isCollapsed ? 'justify-center px-3 py-2' : 'px-3 py-2'
              )}
            >
              <LogOut className={isCollapsed ? 'h-4 w-4' : 'mr-2.5 h-4 w-4'} strokeWidth={1.5} />
              {!isCollapsed && 'Log Out'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'pl-[70px]' : 'pl-[280px]'
      }`}>
        <div className="max-w-[1050px] mx-auto p-6">
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
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                <Mail className="w-4 h-4 mr-2" />
                help@revoa.app
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
