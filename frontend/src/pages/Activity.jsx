import { formatDistanceToNow } from 'date-fns';
import { useAppContext } from '../context/AppContext.jsx';

export default function ActivityPage() {
  const { data } = useAppContext();
  const activities = [...(data.activities || [])].sort(
    (a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0),
  );

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Activity Log</h2>
        <p className="text-sm text-slate-500">
          Auditable activity trail across the platform, including asset, maintenance, and user
          events.
        </p>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Details</th>
              <th className="px-4 py-3 text-left">Asset</th>
              <th className="px-4 py-3 text-left">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activities.map((activity) => (
              <tr key={activity.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">
                  <div className="font-semibold text-slate-800">{activity.user_name}</div>
                  <div className="text-xs text-slate-500">{activity.user_email}</div>
                </td>
                <td className="px-4 py-3 uppercase text-xs font-semibold text-primary-600">
                  {activity.action?.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3 text-slate-600">{activity.details}</td>
                <td className="px-4 py-3 text-slate-600">{activity.asset_name || '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {activity.created_date
                    ? formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!activities.length ? (
          <div className="py-12 text-center text-sm text-slate-500">No activity recorded yet.</div>
        ) : null}
      </div>
    </div>
  );
}

