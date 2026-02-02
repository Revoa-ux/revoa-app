import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, AlertCircle, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getUnreadCount,
  getRecentNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  Notification,
} from '@/lib/notificationService';
import { useClickOutside } from '@/lib/useClickOutside';
import { formatDistanceToNow } from 'date-fns';

const BRAND_GRADIENT = 'linear-gradient(135deg, #E11D48 0%, #EC4899 40%, #F87171 70%, #E8795A 100%)';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useClickOutside(dropdownRef, () => setShowDropdown(false));

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const [count, recent] = await Promise.all([
        getUnreadCount(),
        getRecentNotifications(10), // Show more notifications
      ]);
      setUnreadCount(count);
      setNotifications(recent);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification, e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if ((e.target as HTMLElement).closest('button[data-action]')) {
      return;
    }

    try {
      if (!notification.read) {
        await markAsRead(notification.id);
        await fetchNotifications();
      }

      setShowDropdown(false);

      if (notification.link_to) {
        navigate(notification.link_to);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const handleDismissNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      // Update unread count if it was unread
      const wasUnread = notifications.find(n => n.id === notificationId)?.read === false;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await markAllAsRead();
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'cogs_update':
      case 'quote_review':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'invoice_payment':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 w-4 h-4 text-white text-xs font-bold rounded-full flex items-center justify-center"
            style={{ background: BRAND_GRADIENT }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-96 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#3a3a3a]">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors group ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.action_type)}
                      </div>
                      <button
                        onClick={(e) => handleNotificationClick(notification, e)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </button>
                      <button
                        data-action="dismiss"
                        onClick={(e) => handleDismissNotification(notification.id, e)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-[#4a4a4a] rounded transition-all flex-shrink-0"
                        title="Dismiss notification"
                      >
                        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-[#3a3a3a]">
              <Link
                to="/notifications"
                onClick={() => setShowDropdown(false)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                View all notifications →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
