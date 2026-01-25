import { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider, useWebSocket } from './context/WebSocketContext';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { AdminDashboard } from './components/AdminDashboard';
import { Calendar } from './components/Calendar';
import { Classroom } from './components/Classroom';
import { Recordings } from './components/Recordings';
import { Notes } from './components/Notes';
import { ChangePasswordModal } from './components/ChangePasswordModal';

type AuthPage = 'login' | 'register';
type MainView = 'calendar' | 'recordings' | 'notes';

const ClassroomFlow = () => {
  const { roomId, connect, disconnect, joinRoom, error } = useWebSocket();
  const { user, logout } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [currentView, setCurrentView] = useState<MainView>('calendar');
  const [userState, setUserState] = useState<{
    name: string;
    isPresenter: boolean;
    scheduleId?: string;
    scheduleTitle?: string;
  } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Handle joining from calendar
  const handleJoinFromCalendar = useCallback((classRoomId: string, isPresenter: boolean, scheduleId?: string, scheduleTitle?: string) => {
    if (!user) return;

    setIsJoining(true);
    setUserState({ name: user.name, isPresenter, scheduleId, scheduleTitle });
    joinRoom(user.name, isPresenter, isPresenter ? undefined : classRoomId);

    // For presenter starting a class, we need to create the room
    if (isPresenter) {
      // Room is created by schedule start endpoint, use the returned roomId
      joinRoom(user.name, true, classRoomId);
    }
  }, [user, joinRoom]);

  const handleLeave = useCallback(() => {
    disconnect();
    setUserState(null);
    setIsJoining(false);
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  // Reset joining state when room is joined
  useEffect(() => {
    if (roomId) {
      setIsJoining(false);
    }
  }, [roomId]);

  // Reset joining state on error
  useEffect(() => {
    if (error) {
      setIsJoining(false);
    }
  }, [error]);

  // Show classroom if joined
  if (roomId && userState) {
    return (
      <Classroom
        isPresenter={userState.isPresenter}
        userName={userState.name}
        scheduleId={userState.scheduleId}
        scheduleTitle={userState.scheduleTitle}
        onLeave={handleLeave}
      />
    );
  }

  // Show Calendar/Recordings with user header and navigation
  return (
    <div className="relative min-h-screen bg-elegant">
      <div className="fixed inset-0 pattern-overlay pointer-events-none" />

      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-20 glass-panel rounded-none border-x-0 border-t-0">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/brightline-logo.png" alt="Brightline" className="w-8 h-8 object-contain" />
            <span className="font-display font-semibold text-lg">Brightline Academy</span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-[var(--color-surface-200)] rounded-lg p-1">
            <button
              onClick={() => setCurrentView('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${currentView === 'calendar'
                  ? 'bg-[var(--color-accent)] text-[var(--color-surface)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
            >
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Schedule
              </span>
            </button>
            <button
              onClick={() => setCurrentView('recordings')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${currentView === 'recordings'
                  ? 'bg-[var(--color-accent)] text-[var(--color-surface)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
            >
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
                Recordings
              </span>
            </button>
            <button
              onClick={() => setCurrentView('notes')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${currentView === 'notes'
                  ? 'bg-[var(--color-accent)] text-[var(--color-surface)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
            >
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Notes
              </span>
            </button>
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-300)] transition-colors"
            >
              <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                {user?.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-sm hidden sm:block text-left">
                <p className="font-medium">{user?.name}</p>
                <p className="text-xs text-[var(--color-text-muted)] capitalize">{user?.role}</p>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`text-[var(--color-text-muted)] transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Dropdown Menu */}
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
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
                      <path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-16 relative z-10">
        {isJoining && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-[var(--color-surface)]/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40, borderWidth: 3 }} />
              <p className="text-[var(--color-text-muted)]">Connecting to class...</p>
            </div>
          </div>
        )}

        {currentView === 'calendar' && (
          <Calendar onJoinClass={handleJoinFromCalendar} />
        )}
        {currentView === 'recordings' && <Recordings />}
        {currentView === 'notes' && <Notes />}
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  );
};

const AuthenticatedApp = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-elegant">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <p className="text-[var(--color-text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Admin users see the admin dashboard
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  // Presenters and students see the calendar/classroom flow
  return (
    <WebSocketProvider>
      <ClassroomFlow />
    </WebSocketProvider>
  );
};

const UnauthenticatedApp = () => {
  const [page, setPage] = useState<AuthPage>('login');

  if (page === 'register') {
    return <RegisterPage onSwitchToLogin={() => setPage('login')} />;
  }

  return <LoginPage onSwitchToRegister={() => setPage('register')} />;
};

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-elegant">
        <div className="fixed inset-0 pattern-overlay" />
        <div className="text-center relative z-10">
          <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <p className="text-[var(--color-text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <AuthenticatedApp />;
  }

  return <UnauthenticatedApp />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
