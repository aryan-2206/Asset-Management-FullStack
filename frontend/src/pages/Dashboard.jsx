import { useEffect, useMemo, useRef } from 'react';
import Chart from 'chart.js/auto';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { useAppContext } from '../context/AppContext';

export default function Dashboard() {
  const { data } = useAppContext();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const assets = data.assets || [];
  const properties = data.properties || [];
  const loans = data.loans || [];
  const maintenances = data.maintenances || [];
  const procurements = data.procurements || [];
  const notifications = data.notifications || [];

  const stats = useMemo(() => {
    const totalValue = assets.reduce((acc, asset) => acc + (Number(asset.current_value) || 0), 0);
    const activeLoans = (data.loans || []).filter((loan) => loan.status === 'active').length;
    const overdueLoans = (data.loans || []).filter((loan) => {
      if (loan.status !== 'active') return false;
      try {
        const due = parseISO(loan.expected_return_date);
        return due < new Date();
      } catch (error) {
        return false;
      }
    }).length;
    const openMaintenance = maintenances.filter((item) =>
      ['pending', 'approved', 'in_progress'].includes(item.status),
    ).length;
    const pendingProcurement = procurements.filter((item) =>
      ['pending', 'manager_approved'].includes(item.status),
    ).length;

    const totalPropertyValue = properties.reduce(
      (acc, prop) => acc + (Number(prop.price || prop.monthly_cost || 0) || 0),
      0,
    );

    return {
      totalAssets: assets.length,
      totalProperties: properties.length,
      totalValue,
      totalPropertyValue,
      activeLoans,
      overdueLoans,
      openMaintenance,
      pendingProcurement,
      notifications: notifications.length,
    };
  }, [assets, properties, maintenances, procurements, notifications, data.loans]);

  const chartData = useMemo(() => {
    const counts = assets.reduce((acc, asset) => {
      const key = asset.category || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return {
      labels: Object.keys(counts),
      values: Object.values(counts),
    };
  }, [assets]);

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    if (!chartData.labels.length) return;
    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: chartData.labels.map((label) => label.replace(/_/g, ' ')),
        datasets: [
          {
            data: chartData.values,
            backgroundColor: [
              '#6366f1',
              '#ec4899',
              '#10b981',
              '#f59e0b',
              '#8b5cf6',
              '#0ea5e9',
              '#14b8a6',
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    });
    return () => {
      chartInstance.current?.destroy();
    };
  }, [chartData]);

  const recentAssets = useMemo(() => {
    return [...assets]
      .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
      .slice(0, 5);
  }, [assets]);

  const recentProperties = useMemo(() => {
    return [...properties]
      .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
      .slice(0, 5);
  }, [properties]);

  const recentLoans = useMemo(() => {
    return [...loans]
      .sort((a, b) => new Date(b.created_date || b.loan_date || 0) - new Date(a.created_date || a.loan_date || 0))
      .slice(0, 5);
  }, [loans]);

  const activityFeed = useMemo(() => {
    return [...(data.activities || [])]
      .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
      .slice(0, 6);
  }, [data.activities]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard title="Total Assets" value={stats.totalAssets} subtitle="Across all categories" />
        <StatCard
          title="Total Asset Value"
          value={`₹${stats.totalValue.toLocaleString('en-IN')}`}
          subtitle="Current depreciated value"
        />
        <StatCard
          title="Total Properties"
          value={stats.totalProperties}
          subtitle="Properties & facilities"
        />
        <StatCard
          title="Property Value"
          value={`₹${stats.totalPropertyValue.toLocaleString('en-IN')}`}
          subtitle="Total property portfolio"
        />
        <StatCard
          title="Active Loans"
          value={`${stats.activeLoans}`}
          subtitle={stats.overdueLoans ? `${stats.overdueLoans} overdue` : 'On schedule'}
          status={stats.overdueLoans ? 'warning' : 'success'}
        />
        <StatCard
          title="Open Maintenance"
          value={stats.openMaintenance}
          subtitle="Pending or in progress"
        />
        <StatCard
          title="Pending Procurement"
          value={stats.pendingProcurement}
          subtitle="Awaiting approvals"
        />
        <StatCard
          title="Notifications"
          value={stats.notifications}
          subtitle="Recent alerts"
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Assets by Category</h2>
          {chartData.labels.length ? (
            <canvas ref={chartRef} className="max-h-80" />
          ) : (
            <EmptyState message="No assets available yet. Add your first asset to see insights." />
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {activityFeed.length ? (
              activityFeed.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-semibold">
                    {activity.user_name?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">{activity.user_name}</span>{' '}
                      <span className="text-slate-500">{activity.details}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {activity.created_date
                        ? formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })
                        : '—'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="No activity recorded yet." />
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Recently Added Assets</h2>
          <div className="divide-y divide-slate-100">
            {recentAssets.length ? (
              recentAssets.map((asset) => (
                <div key={asset.id} className="py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{asset.name}</p>
                    <p className="text-xs text-slate-500">
                      Added on{' '}
                      {asset.created_date
                        ? format(parseISO(asset.created_date), 'PPP')
                        : 'Not available'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Current value</p>
                    <p className="text-sm font-semibold text-slate-700">
                      ₹{Number(asset.current_value || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="No assets yet. Add assets to build your inventory." />
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Recently Added Properties</h2>
          <div className="divide-y divide-slate-100">
            {recentProperties.length ? (
              recentProperties.map((property) => (
                <div key={property.id} className="py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{property.property_name}</p>
                    <p className="text-xs text-slate-500">
                      {property.address}, {property.city}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Added on{' '}
                      {property.created_date
                        ? format(parseISO(property.created_date), 'PPP')
                        : 'Not available'}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    {property.price ? (
                      <>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Price</p>
                        <p className="text-sm font-semibold text-slate-700">
                          ₹{Number(property.price).toLocaleString('en-IN')}
                        </p>
                      </>
                    ) : property.monthly_cost ? (
                      <>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Monthly</p>
                        <p className="text-sm font-semibold text-slate-700">
                          ₹{Number(property.monthly_cost).toLocaleString('en-IN')}
                        </p>
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="No properties yet. Add properties to track your facilities." />
            )}
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">Recent Loans</h2>
        <div className="divide-y divide-slate-100">
          {recentLoans.length ? (
            recentLoans.map((loan) => {
              const isOverdue = loan.status === 'active' && loan.expected_return_date && 
                parseISO(loan.expected_return_date) < new Date();
              return (
                <div key={loan.id} className="py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{loan.asset_name}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        loan.status === 'active' 
                          ? isOverdue 
                            ? 'bg-red-100 text-red-600' 
                            : 'bg-sky-100 text-sky-600'
                          : loan.status === 'returned'
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {loan.status === 'active' && isOverdue ? 'Overdue' : loan.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {loan.borrower_name} · {loan.borrower_email}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {loan.expected_return_date
                        ? `Due: ${format(parseISO(loan.expected_return_date), 'PPP')}`
                        : loan.loan_date
                        ? `Loaned: ${format(parseISO(loan.loan_date), 'PPP')}`
                        : 'No date available'}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
                    <p className={`text-sm font-semibold ${
                      isOverdue ? 'text-red-600' : 
                      loan.status === 'returned' ? 'text-emerald-600' : 
                      'text-slate-700'
                    }`}>
                      {loan.status === 'active' && isOverdue ? 'Overdue' : loan.status}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState message="No loans yet. Add loans to track asset lending." />
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, subtitle, status = 'default' }) {
  const statusStyles = {
    default: 'bg-primary-50 text-primary-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</h3>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyles[status]}`}>
          {subtitle}
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
      <p className="text-sm">{message}</p>
    </div>
  );
}

