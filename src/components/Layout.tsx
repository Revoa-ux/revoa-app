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
  Package
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import Modal from './Modal';

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
      <div className="w-[280px] fixed inset-y-0 left-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="py-8 px-6">
            <div className="w-32 h-8 relative">
              <img 
                src={isDarkMode 
                  ? "https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket//Revoa%20Logo%20White.png"
                  : "https://jfwmnaaujzuwrqqhgmuf.supabase.co/storage/v1/object/public/REVOA%20(Public)//REVOA%20LOGO.png"
                }
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Account Selector */}
          <div className="px-4 py-4">
            <button className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition-colors">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center">
                  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=ux" alt="Avatar" className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-base font-medium text-gray-900 dark:text-white">YourShop</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">92841a-12</div>
                </div>
              </div>
            </button>
          </div>

          {/* Main Menu */}
          <div className="flex-1 overflow-y-auto px-3 py-4 border-y border-gray-100 dark:border-gray-700">
            <nav className="space-y-0.5">
              {navigation.map((item) => {
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

          {/* Preferences */}
          <div className="px-3 py-4">
            <nav className="space-y-0.5">
              <Link
                to="/settings"
                className={cn(
                  'flex items-center px-3 py-2 text-[13px] rounded-lg transition-colors',
                  location.pathname === '/settings'
                    ? 'bg-gray-900 text-white dark:bg-gray-600 dark:text-white font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                <Settings className="mr-2.5 h-4 w-4" strokeWidth={1.5} />
                Settings
              </Link>
              <button
                onClick={() => setShowHelpModal(true)}
                className="w-full flex items-center px-3 py-2 text-[13px] text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Headphones className="mr-2.5 h-4 w-4" strokeWidth={1.5} />
                Help & Support
              </button>
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

      {/* Main content area */}
      <div className="flex-1 pl-[280px]">
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
