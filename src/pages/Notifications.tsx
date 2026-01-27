import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Filter, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../lib/toast';
import {
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  Notification,
} from '@/lib/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { SubscriptionPageWrapper } from '@/components/subscription/SubscriptionPageWrapper';
import { useIsBlocked } from '@/components/subscription/SubscriptionGate';

type FilterType = 'all' | 'unread' | 'action_required';

export default function Notifications() {
  const isBlocked = useIsBlocked();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (isBlocked) {
      setLoading(false);
      return;
    }
    fetchNotifications();
  }, [isBlocked]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getAllNotifications();
      setNotifications(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.read) {
        await markAsRead(notification.id);
        await fetchNotifications();
      }

      if (notification.link_to) {
        navigate(notification.link_to);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      await fetchNotifications();
      toast.success('All notifications marked as read');
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark all as read');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      await deleteNotification(id);
      await fetchNotifications();
      toast.success('Notification deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete notification');
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'cogs_update':
      case 'quote_review':
        return (
          <div className="flex items-center justify-center w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
        );
      case 'invoice_payment':
        return (
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-[#2a2a2a] rounded-lg">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
        );
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'action_required') return n.action_required;
    return true;
  });

  const unreadCount = isBlocked ? '...' : notifications.filter((n) => !n.read).length;

  return (
    <SubscriptionPageWrapper>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Notifications
        </h1>
        <div className="flex items-start sm:items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isBlocked ? '... notifications' : (unreadCount as number) > 0 ? `${unreadCount} unread notification${(unreadCount as number) !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === 'all'
                ? 'btn btn-primary'
                : 'btn btn-secondary'
            }`}
          >
            All ({isBlocked ? '...' : notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === 'unread'
                ? 'btn btn-primary'
                : 'btn btn-secondary'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('action_required')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === 'action_required'
                ? 'btn btn-primary'
                : 'btn btn-secondary'
            }`}
          >
            Action Required ({isBlocked ? '...' : notifications.filter((n) => n.action_required).length})
          </button>
        </div>

        {!isBlocked && (unreadCount as number) > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn btn-secondary px-4 py-2 text-sm font-medium flex items-center gap-2"
          >
            <Check className="btn-icon" />
            Mark All Read
          </button>
        )}
      </div>

      {loading && !isBlocked ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : isBlocked ? (
        <div className="bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#333333] divide-y divide-gray-200 dark:divide-[#333333]">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="p-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-[#2a2a2a] rounded-lg">
                    <Bell className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-400 dark:text-gray-500">...</h4>
                  </div>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">...</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">...</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#333333]">
          <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {filter === 'all' ? 'No notifications yet' : `No ${filter.replace('_', ' ')} notifications`}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filter === 'all'
              ? "You're all caught up! Notifications will appear here when you have new updates."
              : `You don't have any ${filter.replace('_', ' ')} notifications at the moment.`}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#333333] divide-y divide-gray-200 dark:divide-[#333333]">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50 transition-colors cursor-pointer ${
                !notification.read ? 'bg-rose-50 dark:bg-rose-900/10' : ''
              }`}
            >
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.action_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                      )}
                      {notification.action_required && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                          Action Required
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDelete(notification.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {notification.message}
                  </p>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </p>

                    {notification.link_to && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        View details →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </SubscriptionPageWrapper>
  );
}
