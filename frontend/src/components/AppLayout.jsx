import { useMemo } from 'react';
import {
  LayoutDashboard,
  Boxes,
  RefreshCw,
  ShoppingCart,
  Building2,
  Users,
  Activity,
  Bell,
  FileBarChart,
  Settings,
  UserCog,
  LogOut,
  Palette,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'assets', label: 'Assets', icon: Boxes },
  { id: 'loans', label: 'Loans', icon: RefreshCw },
  { id: 'maintenance', label: 'Maintenance', icon: Activity },
  { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'vendors', label: 'Vendors', icon: Users },
  { id: 'activity', label: 'Activity', icon: Activity, role: 'admin' },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'usermanagement', label: 'Users', icon: UserCog, role: 'admin' },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AppLayout({
  user,
  currentPage,
  onNavigate,
  onSignOut,
  onToggleTheme,
  children,
  notifications = [],
}) {
  const navItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (item.role === 'admin') {
        return user?.role === 'admin';
      }
      if (item.role === 'manager') {
        return user?.role === 'admin' || user?.role === 'manager';
      }
      return true;
    });
  }, [user]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center font-semibold">
              AF
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">AssetFlow</p>
              <h1 className="text-xl font-semibold text-slate-900">Asset Management Platform</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleTheme}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-primary-500 hover:text-primary-600 transition"
            >
              <Palette className="h-4 w-4" />
              Theme
            </button>
            <div className="hidden md:block text-right">
              <p className="text-xs uppercase text-slate-400">Signed in as</p>
              <p className="text-sm font-semibold text-slate-700">
                {user?.full_name}{' '}
                <span className="ml-2 inline-flex rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-600">
                  {user?.role?.toUpperCase()}
                </span>
              </p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-red-500 hover:text-red-500 transition"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6 grid grid-cols-1 xl:grid-cols-[220px_1fr] gap-6">
        <nav className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 h-fit sticky top-6">
          <ul className="space-y-1">
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = currentPage === id;
              const badge = id === 'notifications' && unreadCount > 0;
              return (
                <li key={id}>
                  <button
                    onClick={() => onNavigate(id)}
                    className={`w-full inline-flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-primary-50 text-primary-600 border border-primary-200'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {label}
                    </span>
                    {badge ? (
                      <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-semibold h-5 min-w-[1.5rem] px-2">
                        {unreadCount}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="space-y-6 pb-16">{children}</main>
      </div>
    </div>
  );
}

