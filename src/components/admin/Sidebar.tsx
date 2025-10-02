import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home,
  Users,
  MessageSquare,
  FileText,
  Package,
  Settings,
  UserPlus,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: Home },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'Quote Requests', href: '/admin/quotes', icon: FileText },
  { name: 'Conversations', href: '/admin/chat', icon: MessageSquare },
  { name: 'Product Portal', href: '/admin/products', icon: Package },
  { name: 'Bulk Invoices', href: '/admin/invoices', icon: FileText },
  { name: 'Manage Admins', href: '/admin/admins', icon: UserPlus, superAdminOnly: true },
  { name: 'Settings', href: '/admin/settings', icon: Settings }
];

export default function AdminSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isSuperAdmin } = useAdmin();

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
    <div className="w-[280px] fixed inset-y-0 left-0 bg-white border-r border-gray-200">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="py-8 px-6">
          <div className="w-32 h-8 relative">
            <img
              src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
              alt="Logo"
              className="w-full h-full object-contain"
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
                      ? 'bg-gray-900 text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Icon className="mr-2.5 h-4 w-4" strokeWidth={1.5} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Log Out */}
        <div className="p-3">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 mt-0.5 text-[13px] text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LogOut className="mr-2.5 h-4 w-4" strokeWidth={1.5} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}