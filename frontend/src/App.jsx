import { useEffect, useMemo, useState, useCallback } from 'react';
import { AppProvider, useAppContext } from './context/AppContext.jsx';
import { api } from './api/client.js';
import AuthScreen from './components/AuthScreen.jsx';
import AppLayout from './components/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AssetsPage from './pages/Assets.jsx';
import LoansPage from './pages/Loans.jsx';
import MaintenancePage from './pages/Maintenance.jsx';
import ProcurementPage from './pages/Procurement.jsx';
import PropertiesPage from './pages/Properties.jsx';
import VendorsPage from './pages/Vendors.jsx';
import ActivityPage from './pages/Activity.jsx';
import NotificationsPage from './pages/Notifications.jsx';
import ReportsPage from './pages/Reports.jsx';
import SettingsPage from './pages/Settings.jsx';
import UsersPage from './pages/Users.jsx';

const THEME_KEY = 'assetflow-theme';

function AppInner() {
  const { refreshCollections, data, loading, error } = useAppContext();
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('idle'); // idle | loading | ready
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [toast, setToast] = useState(null);

  const theme = useMemo(() => localStorage.getItem(THEME_KEY) || 'light', []);

  useEffect(() => {
    document.documentElement.classList.remove('theme-dark');
    if (theme === 'dark') {
      document.documentElement.classList.add('theme-dark');
    }
  }, [theme]);

  const showToast = useCallback((message, variant = 'success') => {
    setToast({ id: Date.now(), message, variant });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleAuthSuccess = useCallback(
    async (authedUser) => {
      setUser(authedUser);
      localStorage.setItem('authEmail', authedUser.email);
      localStorage.removeItem('pendingEmail');
      try {
        await refreshCollections();
        setAuthStatus('ready');
      } catch (err) {
        console.error('Failed to refresh data', err);
      }
    },
    [refreshCollections],
  );

  const restoreSession = useCallback(async () => {
    const savedEmail = localStorage.getItem('authEmail');
    if (!savedEmail) {
      setAuthStatus('idle');
      return;
    }
    try {
      setAuthStatus('loading');
      const me = await api.me();
      await handleAuthSuccess(me);
    } catch (err) {
      console.warn('Session restore failed', err);
      localStorage.removeItem('authEmail');
      setAuthStatus('idle');
    }
  }, [handleAuthSuccess]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refreshCollections().catch((err) => console.error('Background refresh failed', err));
    }, 60000);
    return () => clearInterval(interval);
  }, [user, refreshCollections]);

  const handleRequestOtp = async (email) => {
    setAuthStatus('loading');
    try {
      await api.requestOtp(email);
      showToast('OTP sent to your email. Please check your inbox.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to send OTP.', 'error');
    } finally {
      setAuthStatus('idle');
    }
  };

  const handleVerifyOtp = async ({ email, code }) => {
    console.log('[AUTH] Verifying OTP for', email, 'with code', code);
    setAuthStatus('loading');
    try {
      const response = await api.verifyOtp({ email, code });
      console.log('[AUTH] Verify response:', response);
      const authedUser = response.user;
      if (!authedUser) {
        throw new Error('No user data in response');
      }
      await handleAuthSuccess(authedUser);
      showToast('Welcome back!', 'success');
    } catch (err) {
      console.error('[AUTH] Verify error:', err);
      showToast(err.message || 'Verification failed.', 'error');
      setAuthStatus('idle');
    }
  };

  const handleSignup = async ({ email, password, full_name }) => {
    setAuthStatus('loading');
    try {
      const response = await api.signup({ email, password, full_name });
      const authedUser = response.user;
      if (!authedUser) {
        throw new Error('No user data in response');
      }
      await handleAuthSuccess(authedUser);
      showToast('Account created successfully!', 'success');
    } catch (err) {
      console.error('[AUTH] Signup error:', err);
      showToast(err.message || 'Signup failed.', 'error');
      setAuthStatus('idle');
    }
  };

  const handleLogin = async ({ email, password }) => {
    setAuthStatus('loading');
    try {
      const response = await api.login({ email, password });
      const authedUser = response.user;
      if (!authedUser) {
        throw new Error('No user data in response');
      }
      await handleAuthSuccess(authedUser);
      showToast('Welcome back!', 'success');
    } catch (err) {
      console.error('[AUTH] Login error:', err);
      showToast(err.message || 'Login failed.', 'error');
      setAuthStatus('idle');
    }
  };

  const handleSignOut = async () => {
    try {
      await api.logout(user?.email || localStorage.getItem('authEmail') || '');
    } catch (err) {
      console.warn('Logout failed', err);
    } finally {
      localStorage.removeItem('authEmail');
      localStorage.removeItem('pendingEmail');
      setUser(null);
      setAuthStatus('idle');
      setCurrentPage('dashboard');
    }
  };

  const toggleTheme = () => {
    const current = localStorage.getItem(THEME_KEY) || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.classList.toggle('theme-dark');
  };

  const pages = useMemo(
    () => ({
      dashboard: <Dashboard />,
      assets: <AssetsPage showToast={showToast} currentUser={user} />,
      loans: <LoansPage showToast={showToast} />,
      maintenance: <MaintenancePage showToast={showToast} />,
      procurement: <ProcurementPage showToast={showToast} />,
      properties: <PropertiesPage showToast={showToast} />,
      vendors: <VendorsPage showToast={showToast} />,
      activity: <ActivityPage />,
      notifications: <NotificationsPage showToast={showToast} />,
      reports: <ReportsPage showToast={showToast} />,
      settings: <SettingsPage user={user} onUserUpdated={setUser} showToast={showToast} />,
      usermanagement: <UsersPage showToast={showToast} />,
    }),
    [showToast, user],
  );

  if (!user || authStatus === 'idle') {
    return (
      <AuthScreen
        onRequestOtp={handleRequestOtp}
        onVerifyOtp={handleVerifyOtp}
        onSignup={handleSignup}
        onLogin={handleLogin}
        busy={authStatus === 'loading'}
      />
    );
  }

  return (
    <>
      <AppLayout
        user={user}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onSignOut={handleSignOut}
        onToggleTheme={toggleTheme}
        notifications={data.notifications || []}
      >
        {loading && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Refreshing data…</div>}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            Failed to load data: {error.message}
          </div>
        )}
        {pages[currentPage] || pages.dashboard}
      </AppLayout>
      {toast ? (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`rounded-xl px-4 py-3 shadow-lg text-sm font-medium ${
              toast.variant === 'error'
                ? 'bg-red-500 text-white'
                : toast.variant === 'warning'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-900 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

