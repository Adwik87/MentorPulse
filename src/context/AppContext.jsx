import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState('mentor'); // 'mentor', 'mentee', 'coordinator', 'admin'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch all users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
      // Default to Dr. Eleanor Vance (mentor)
      const defaultUser = data.find(u => u.role === 'mentor') || data[0];
      if (defaultUser) {
        setCurrentUser(defaultUser);
        setRole(defaultUser.role);
      }
    } catch (e) {
      console.error('Failed to fetch users', e);
    }
  };

  // Switch role handler
  const switchRole = (newRole) => {
    setRole(newRole);
    const targetUser = users.find(u => u.role === newRole) || users[0];
    if (targetUser) {
      setCurrentUser(targetUser);
    }
  };

  // Fetch Notifications
  useEffect(() => {
    if (currentUser) {
      fetchNotifications(currentUser.id);
    }
  }, [currentUser]);

  const fetchNotifications = async (userId) => {
    try {
      const res = await fetch(`/api/analytics/notifications?user_id=${userId}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await fetch(`/api/analytics/notifications/${id}/read`, { method: 'PUT' });
      if (currentUser) fetchNotifications(currentUser.id);
    } catch (e) {
      console.error(e);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch('/api/analytics/notifications/read-all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser?.id })
      });
      if (currentUser) fetchNotifications(currentUser.id);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      users,
      role,
      switchRole,
      activeTab,
      setActiveTab,
      notifications,
      unreadCount,
      markNotificationRead,
      markAllNotificationsRead,
      refreshNotifications: () => currentUser && fetchNotifications(currentUser.id)
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
