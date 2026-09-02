import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  UserCheck,
  Calendar,
  Target,
  Users,
  BarChart3,
  Shield,
  BookOpen,
  CheckSquare,
  X,
  Check,
  FileText
} from 'lucide-react';

export default function Header() {
  const { currentUser, role, switchRole, activeTab, setActiveTab, notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="bg-blue-600 p-2 rounded text-white font-bold text-xl tracking-tight flex items-center space-x-1">
              <BookOpen className="w-5 h-5" />
              <span>MentorPulse</span>
            </div>
            <span className="text-xs uppercase bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded tracking-wider border border-slate-700">
              University Edition
            </span>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'dashboard' ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'calendar' ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Calendar & Sessions
            </button>

            {(role === 'mentor' || role === 'mentee') && (
              <button
                onClick={() => setActiveTab('goals')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'goals' ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                Goals & Action Items
              </button>
            )}

            {(role === 'coordinator' || role === 'admin') && (
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'analytics' ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                Program Analytics
              </button>
            )}

            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'audit' ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                Audit Logs
              </button>
            )}
          </nav>

          {/* Right Area: Role Switcher & Notifications */}
          <div className="flex items-center space-x-4">
            {/* Role Selector */}
            <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400 px-2 font-medium">Role:</span>
              <select
                value={role}
                onChange={(e) => switchRole(e.target.value)}
                className="bg-slate-900 text-xs font-semibold text-white px-2 py-1 rounded border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="mentor">Mentor View</option>
                <option value="mentee">Mentee View</option>
                <option value="coordinator">Coordinator View</option>
                <option value="admin">Admin View</option>
              </select>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-300 hover:text-white rounded-full hover:bg-slate-800 relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-lg shadow-xl border border-slate-200 z-50">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                    <div className="flex items-center space-x-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Mark all as read
                        </button>
                      )}
                      <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">No notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                            !n.is_read ? 'bg-blue-50/50 font-medium' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-semibold text-slate-900">{n.title}</span>
                            <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-600 mt-1">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Badge */}
            <div className="flex items-center space-x-2 border-l border-slate-800 pl-3">
              <img
                src={currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt="Avatar"
                className="w-8 h-8 rounded-full border border-slate-700 object-cover"
              />
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold leading-tight text-white">{currentUser?.name}</div>
                <div className="text-[10px] text-slate-400 leading-tight">{currentUser?.department || currentUser?.role}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
