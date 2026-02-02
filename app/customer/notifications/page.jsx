'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut, Bell, Trash2, CheckCircle, AlertCircle, Info, Package, Truck, DollarSign, Heart, Clock, X } from 'lucide-react';

function NotificationsContent() {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const customerData = localStorage.getItem('customer');
      if (!customerData) {
        router.push('/customer/login');
        return;
      }

      const parsedCustomer = JSON.parse(customerData);
      setCustomer(parsedCustomer);

      // Load notifications from localStorage
      loadNotifications();
      setLoading(false);
    } catch (error) {
      console.error('[Notifications] Error:', error);
      setLoading(false);
    }
  };

  const loadNotifications = () => {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed);
        const unread = parsed.filter((n) => !n.read).length;
        setUnreadCount(unread);
        applyFilter(parsed, 'all');
      } catch (error) {
        console.error('Error parsing notifications:', error);
        setNotifications([]);
      }
    } else {
      // Initialize with default notifications
      initializeDefaultNotifications();
    }
  };

  const initializeDefaultNotifications = () => {
    const defaultNotifications = [
      {
        id: '1',
        type: 'order',
        title: 'Order Confirmed! 🎉',
        message: 'Your order #ABC123 has been confirmed and is being prepared for shipment.',
        icon: CheckCircle,
        color: 'green',
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        read: false,
      },
      {
        id: '2',
        type: 'shipping',
        title: 'Order Shipped! 🚚',
        message: 'Your order #DEF456 has been shipped. Tracking ID: 1Z999AA10123456784',
        icon: Truck,
        color: 'blue',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        read: false,
      },
      {
        id: '3',
        type: 'payment',
        title: 'Payment Successful! ✅',
        message: 'Payment of $80.41 has been successfully processed for order #GHI789.',
        icon: DollarSign,
        color: 'green',
        date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
        read: true,
      },
      {
        id: '4',
        type: 'promo',
        title: 'Special Offer! 🎁',
        message: 'Get 20% off on your next purchase! Use code: WELCOME20',
        icon: Gift,
        color: 'purple',
        date: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 3 days ago
        read: true,
      },
      {
        id: '5',
        type: 'info',
        title: 'Account Update',
        message: 'We have updated our privacy policy. Please review the changes.',
        icon: Info,
        color: 'blue',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        read: true,
      },
    ];

    setNotifications(defaultNotifications);
    setUnreadCount(defaultNotifications.filter((n) => !n.read).length);
    applyFilter(defaultNotifications, 'all');
    localStorage.setItem('notifications', JSON.stringify(defaultNotifications));
  };

  useEffect(() => {
    applyFilter(notifications, filterType);
  }, [filterType, notifications]);

  const applyFilter = (notificationsList, type) => {
    if (type === 'all') {
      setFilteredNotifications(notificationsList.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } else {
      const filtered = notificationsList.filter((n) => n.type === type);
      setFilteredNotifications(filtered.sort((a, b) => new Date(b.date) - new Date(a.date)));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer');
    localStorage.removeItem('customerToken');
    router.push('/');
  };

  const markAsRead = (notificationId) => {
    const updated = notifications.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    setNotifications(updated);
    localStorage.setItem('notifications', JSON.stringify(updated));
    setUnreadCount(updated.filter((n) => !n.read).length);
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('notifications', JSON.stringify(updated));
    setUnreadCount(0);
  };

  const deleteNotification = (notificationId) => {
    const updated = notifications.filter((n) => n.id !== notificationId);
    setNotifications(updated);
    localStorage.setItem('notifications', JSON.stringify(updated));
    setUnreadCount(updated.filter((n) => !n.read).length);
  };

  const deleteAllNotifications = () => {
    if (confirm('Are you sure you want to delete all notifications?')) {
      setNotifications([]);
      setFilteredNotifications([]);
      setUnreadCount(0);
      localStorage.removeItem('notifications');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order':
        return <Package size={20} />;
      case 'shipping':
        return <Truck size={20} />;
      case 'payment':
        return <DollarSign size={20} />;
      case 'promo':
        return <Heart size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  const getIconColor = (color) => {
    const colors = {
      green: 'text-green-400',
      blue: 'text-blue-400',
      purple: 'text-purple-400',
      yellow: 'text-yellow-400',
      red: 'text-red-400',
    };
    return colors[color] || 'text-gray-400';
  };

  const getBackgroundColor = (color) => {
    const colors = {
      green: 'bg-green-600/20',
      blue: 'bg-blue-600/20',
      purple: 'bg-purple-600/20',
      yellow: 'bg-yellow-600/20',
      red: 'bg-red-600/20',
    };
    return colors[color] || 'bg-gray-600/20';
  };

  const getTypeLabel = (type) => {
    const labels = {
      all: 'All Notifications',
      order: '📦 Orders',
      shipping: '🚚 Shipping',
      payment: '💳 Payments',
      promo: '🎁 Promotions',
      info: 'ℹ️ Information',
    };
    return labels[type] || type;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-800 rounded-lg border border-slate-700 p-8 text-center space-y-6">
          <h1 className="text-2xl font-bold text-white">Not Logged In</h1>
          <p className="text-gray-400">Please login to view notifications</p>
          <Link href="/customer/login" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-800/50 border-b border-slate-700 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/customer/account" className="p-2 hover:bg-slate-700 rounded-lg transition">
                <ArrowLeft size={20} className="text-gray-400" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Bell size={24} className="text-yellow-400" />
                  Notifications
                </h1>
                <p className="text-xs text-gray-400">{unreadCount} unread</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 rounded-lg transition text-red-400">
              <LogOut size={20} />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilterType('order')}
              className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                filterType === 'order'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              📦 Orders
            </button>
            <button
              onClick={() => setFilterType('shipping')}
              className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                filterType === 'shipping'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              🚚 Shipping
            </button>
            <button
              onClick={() => setFilterType('payment')}
              className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                filterType === 'payment'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              💳 Payments
            </button>
            <button
              onClick={() => setFilterType('promo')}
              className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                filterType === 'promo'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              🎁 Promos
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Action Buttons */}
        {notifications.length > 0 && (
          <div className="flex gap-3 mb-6">
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-semibold transition"
            >
              Mark All as Read
            </button>
            <button
              onClick={deleteAllNotifications}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-semibold transition"
            >
              Delete All
            </button>
          </div>
        )}

        {/* Notifications List */}
        {filteredNotifications.length > 0 ? (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg border transition ${
                  notification.read
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-slate-800 border-blue-500/50 ring-1 ring-blue-500/20'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    {/* Icon & Content */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-lg ${getBackgroundColor(notification.color)} flex-shrink-0`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-white text-base">{notification.title}</h3>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-2">{notification.message}</p>
                        <p className="text-xs text-gray-500">{formatDate(notification.date)}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition text-green-400 hover:text-green-300"
                          title="Mark as read"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 hover:bg-slate-700 rounded-lg transition text-red-400 hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bell size={48} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Notifications</h3>
            <p className="text-gray-400 mb-6">
              {filterType === 'all'
                ? "You're all caught up! No new notifications."
                : `No ${getTypeLabel(filterType).toLowerCase()} found.`}
            </p>
            {filterType !== 'all' && (
              <button
                onClick={() => setFilterType('all')}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
              >
                View All Notifications
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationsSuspense() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsSuspense />}>
      <NotificationsContent />
    </Suspense>
  );
}
