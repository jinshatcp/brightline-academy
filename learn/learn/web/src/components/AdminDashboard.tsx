import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { BatchManagement } from './BatchManagement';
import { Notes } from './Notes';
import { ChangePasswordModal } from './ChangePasswordModal';
import type { User, AdminStats, UserStatus } from '../types';

const API_BASE = '/api';

type Tab = 'users' | 'batches' | 'notes';

/**
 * AdminDashboard - Premium admin panel for managing users, batches, and classes.
 */
export const AdminDashboard: React.FC = () => {
  const { token, user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const endpoint = filter === 'pending' 
        ? `${API_BASE}/admin/users/pending`
        : `${API_BASE}/admin/users${filter !== 'all' ? `?status=${filter}` : ''}`;
      
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, [token, filter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [token]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchUsers(), fetchStats()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchUsers, fetchStats]);

  const updateUserStatus = async (userId: string, status: UserStatus) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      
      if (res.ok) {
        await Promise.all([fetchUsers(), fetchStats()]);
      }
    } catch (err) {
      console.error('Failed to update user status:', err);
    }
    setActionLoading(null);
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    setActionLoading(userId);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        await Promise.all([fetchUsers(), fetchStats()]);
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
    setActionLoading(null);
  };

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'approved': return 'text-[var(--color-success)] bg-[rgba(52,211,153,0.1)] border-[rgba(52,211,153,0.25)]';
      case 'pending': return 'text-[var(--color-warning)] bg-[rgba(251,191,36,0.1)] border-[rgba(251,191,36,0.25)]';
      case 'rejected': return 'text-[var(--color-danger)] bg-[rgba(248,113,113,0.1)] border-[rgba(248,113,113,0.25)]';
      case 'suspended': return 'text-[var(--color-text-muted)] bg-[var(--color-surface-300)] border-[var(--color-border)]';
      default: return '';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'presenter': return 'text-[var(--color-accent)] bg-[rgba(96,165,250,0.1)] border-[rgba(96,165,250,0.25)]';
      case 'student': return 'text-[var(--color-secondary)] bg-[rgba(167,139,250,0.1)] border-[rgba(167,139,250,0.25)]';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-elegant overflow-hidden">
      <div className="fixed inset-0 pattern-overlay" />
      
      {/* Ambient effects */}
      <div className="fixed top-0 right-1/4 w-[600px] h-[400px] bg-[rgba(96,165,250,0.08)] rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 left-1/4 w-[500px] h-[300px] bg-[rgba(167,139,250,0.06)] rounded-full blur-[120px] pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-50 glass-panel border-0 border-b border-[var(--color-border)] rounded-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(96,165,250,0.4)] to-transparent" />
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[rgba(96,165,250,0.2)] to-[rgba(167,139,250,0.1)] border border-[var(--color-border)] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)]">
                <path d="M12 4.5v15m7.5-7.5h-15"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient font-display">
                Admin Dashboard
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">Manage your platform</p>
            </div>
          </div>
          
          <div className="relative z-[100]" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-[rgba(255,255,255,0.05)] transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-secondary)] flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                {user?.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{user?.email}</p>
              </div>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                className={`text-[var(--color-text-muted)] transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl py-2 shadow-2xl animate-fade-up overflow-hidden" style={{ zIndex: 9999, background: 'linear-gradient(135deg, rgba(21, 21, 32, 0.98) 0%, rgba(15, 15, 24, 0.99) 100%)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(96,165,250,0.3)] to-transparent" />
                <button
                  onClick={() => {
                    setShowChangePassword(true);
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[rgba(96,165,250,0.15)] flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  Change Password
                </button>
                <div className="border-t border-[rgba(255,255,255,0.08)] my-2 mx-4" />
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 text-[var(--color-danger)] hover:bg-[rgba(248,113,113,0.1)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[rgba(248,113,113,0.15)] flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-5 mb-10 animate-fade-up">
            <div className="glass-panel rounded-2xl p-6 hover:border-[rgba(251,191,36,0.3)] transition-all duration-300 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[rgba(251,191,36,0.2)] to-[rgba(251,191,36,0.1)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-warning)]">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <span className="text-[var(--color-text-muted)] text-sm font-medium">Pending</span>
              </div>
              <p className="text-4xl font-bold font-display">{stats.pendingCount}</p>
              <p className="text-xs text-[var(--color-text-subtle)] mt-1">Awaiting approval</p>
            </div>
            
            <div className="glass-panel rounded-2xl p-6 hover:border-[rgba(52,211,153,0.3)] transition-all duration-300 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[rgba(52,211,153,0.2)] to-[rgba(52,211,153,0.1)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-success)]">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <span className="text-[var(--color-text-muted)] text-sm font-medium">Approved</span>
              </div>
              <p className="text-4xl font-bold font-display">{stats.approvedCount}</p>
              <p className="text-xs text-[var(--color-text-subtle)] mt-1">Active users</p>
            </div>
            
            <div className="glass-panel rounded-2xl p-6 hover:border-[rgba(96,165,250,0.3)] transition-all duration-300 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[rgba(96,165,250,0.2)] to-[rgba(96,165,250,0.1)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                </div>
                <span className="text-[var(--color-text-muted)] text-sm font-medium">Presenters</span>
              </div>
              <p className="text-4xl font-bold font-display">{stats.presenterCount}</p>
              <p className="text-xs text-[var(--color-text-subtle)] mt-1">Creating content</p>
            </div>
            
            <div className="glass-panel rounded-2xl p-6 hover:border-[rgba(167,139,250,0.3)] transition-all duration-300 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[rgba(167,139,250,0.2)] to-[rgba(167,139,250,0.1)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-secondary)]">
                    <path d="M12 14l9-5-9-5-9 5 9 5z"/>
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                  </svg>
                </div>
                <span className="text-[var(--color-text-muted)] text-sm font-medium">Students</span>
              </div>
              <p className="text-4xl font-bold font-display">{stats.studentCount}</p>
              <p className="text-xs text-[var(--color-text-subtle)] mt-1">Learning</p>
            </div>
          </div>
        )}

        {/* Main Tabs */}
        <div className="glass-panel rounded-3xl overflow-hidden animate-fade-up stagger-1">
          {/* Tab Navigation */}
          <div className="flex border-b border-[var(--color-border)] relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(96,165,250,0.3)] to-transparent" />
            {[
              { id: 'users', label: 'User Management', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12 7a4 4 0 100-8 4 4 0 000 8z' },
              { id: 'batches', label: 'Batch Management', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
              { id: 'notes', label: 'Notes & Documents', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex-1 py-5 px-6 text-sm font-medium transition-all duration-300 relative ${
                  activeTab === tab.id
                    ? 'text-[var(--color-accent)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <span className="flex items-center justify-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={tab.icon} strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-secondary)] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'users' ? (
              <>
                {/* User Filter Pills */}
                <div className="flex gap-3 mb-8">
                  {(['pending', 'approved', 'all'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
                        filter === f
                          ? 'bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-dark)] text-white shadow-lg shadow-[rgba(96,165,250,0.3)]'
                          : 'bg-[rgba(255,255,255,0.05)] text-[var(--color-text-muted)] hover:bg-[rgba(255,255,255,0.08)] border border-[var(--color-border)]'
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                      {f === 'pending' && stats && stats.pendingCount > 0 && (
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                          filter === f ? 'bg-white/20' : 'bg-[var(--color-warning)] text-white'
                        }`}>
                          {stats.pendingCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Users Table */}
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[rgba(96,165,250,0.2)] to-[rgba(167,139,250,0.1)] flex items-center justify-center mb-4 animate-pulse-soft">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                      </svg>
                    </div>
                    <p className="text-[var(--color-text-muted)]">Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-24">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[rgba(96,165,250,0.1)] to-[rgba(167,139,250,0.1)] border border-[var(--color-border)] flex items-center justify-center">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-[var(--color-text-subtle)]">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                        <path d="M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 font-display">No Users Found</h3>
                    <p className="text-[var(--color-text-muted)]">There are no {filter === 'all' ? '' : filter} users to display.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[rgba(255,255,255,0.02)]">
                          <th className="text-left py-4 px-5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">User</th>
                          <th className="text-left py-4 px-5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Role</th>
                          <th className="text-left py-4 px-5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                          <th className="text-left py-4 px-5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Registered</th>
                          <th className="text-right py-4 px-5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u, index) => (
                          <tr 
                            key={u.id} 
                            className="border-t border-[var(--color-border)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-secondary)] flex items-center justify-center text-white font-semibold text-xs shadow-lg">
                                  {u.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-sm">{u.name}</p>
                                  <p className="text-xs text-[var(--color-text-muted)]">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-lg border ${getRoleColor(u.role)}`}>
                                {u.role === 'presenter' ? '🎬 ' : '🎓 '}{u.role}
                              </span>
                            </td>
                            <td className="py-4 px-5">
                              <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-lg border ${getStatusColor(u.status)}`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-sm text-[var(--color-text-muted)]">
                              {new Date(u.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex justify-end gap-2">
                                {u.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => updateUserStatus(u.id, 'approved')}
                                      disabled={actionLoading === u.id}
                                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[rgba(52,211,153,0.1)] text-[var(--color-success)] hover:bg-[rgba(52,211,153,0.2)] border border-[rgba(52,211,153,0.25)] disabled:opacity-50 transition-all"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => updateUserStatus(u.id, 'rejected')}
                                      disabled={actionLoading === u.id}
                                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[rgba(248,113,113,0.1)] text-[var(--color-danger)] hover:bg-[rgba(248,113,113,0.2)] border border-[rgba(248,113,113,0.25)] disabled:opacity-50 transition-all"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {u.status === 'approved' && (
                                  <button
                                    onClick={() => updateUserStatus(u.id, 'suspended')}
                                    disabled={actionLoading === u.id}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[rgba(255,255,255,0.05)] text-[var(--color-text-muted)] hover:bg-[rgba(255,255,255,0.1)] border border-[var(--color-border)] disabled:opacity-50 transition-all"
                                  >
                                    Suspend
                                  </button>
                                )}
                                {(u.status === 'rejected' || u.status === 'suspended') && (
                                  <button
                                    onClick={() => updateUserStatus(u.id, 'approved')}
                                    disabled={actionLoading === u.id}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[rgba(52,211,153,0.1)] text-[var(--color-success)] hover:bg-[rgba(52,211,153,0.2)] border border-[rgba(52,211,153,0.25)] disabled:opacity-50 transition-all"
                                  >
                                    Approve
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteUser(u.id)}
                                  disabled={actionLoading === u.id}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[rgba(248,113,113,0.05)] text-[var(--color-danger)] hover:bg-[rgba(248,113,113,0.15)] border border-[rgba(248,113,113,0.15)] disabled:opacity-50 transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : activeTab === 'batches' ? (
              <BatchManagement />
            ) : (
              <Notes />
            )}
          </div>
        </div>
      </main>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  );
};
