import { formatDistanceToNow } from 'date-fns';
import { useAppContext } from '../context/AppContext.jsx';
import { api } from '../api/client.js';

export default function NotificationsPage({ showToast }) {
  const { data, update, refreshCollections } = useAppContext();
  const notifications = [...(data.notifications || [])].sort(
    (a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0),
  );

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      await refreshCollections();
      showToast?.('Notifications updated.');
    } catch (error) {
      console.error(error);
      showToast?.('Failed to update notifications.', 'error');
    }
  };

  const markRead = async (notification) => {
    try {
      await update('notifications', notification.id, { read: true });
      showToast?.('Notification marked as read.');
    } catch (error) {
      showToast?.(error.message || 'Failed to update notification.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Notifications</h2>
          <p className="text-sm text-slate-500">
            Important events, approvals, and alerts across the AssetFlow platform.
          </p>
        </div>
        <button
          onClick={markAllRead}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-primary-500 hover:text-primary-600 transition"
        >
          Mark all as read
        </button>
      </header>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className={`rounded-2xl border px-6 py-4 shadow-sm transition ${
              notification.read
                ? 'border-slate-200 bg-white'
                : 'border-primary-200 bg-primary-50'
            }`}
          >
            <header className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{notification.title}</h3>
                <p className="text-xs text-slate-500">
                  {notification.type?.replace(/_/g, ' ') || 'general'}
                </p>
              </div>
              <span className="text-xs text-slate-400">
                {notification.created_date
                  ? formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })
                  : '—'}
              </span>
            </header>
            <p className="mt-3 text-sm text-slate-600">{notification.message}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>Audience: {notification.user_email || 'All users'}</span>
              {!notification.read ? (
                <button
                  onClick={() => markRead(notification)}
                  className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                >
                  Mark read
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {!notifications.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          You're all caught up. No notifications yet.
        </div>
      ) : null}
    </div>
  );
}

