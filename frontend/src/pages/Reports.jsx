import { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import { api } from '../api/client.js';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';

export default function ReportsPage({ showToast }) {
  const { data } = useAppContext();
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const summary = useMemo(() => {
    const assets = data.assets || [];
    const loans = data.loans || [];
    const maintenance = data.maintenances || [];
    const procurement = data.procurements || [];

    const totalValue = assets.reduce((acc, asset) => acc + (Number(asset.current_value) || 0), 0);
    const byStatus = assets.reduce((acc, asset) => {
      const key = asset.status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      assetsTotal: assets.length,
      totalValue,
      loansActive: loans.filter((loan) => loan.status === 'active').length,
      maintenanceOpen: maintenance.filter((req) =>
        ['pending', 'approved', 'in_progress'].includes(req.status),
      ).length,
      procurementPending: procurement.filter((req) =>
        ['pending', 'manager_approved'].includes(req.status),
      ).length,
      byStatus,
    };
  }, [data]);

  const exportJson = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      summary,
      assets: data.assets,
      loans: data.loans,
      maintenance: data.maintenances,
      procurement: data.procurements,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assetflow-report-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast?.('JSON report downloaded successfully.', 'success');
  };

  const handleDownloadCSV = async () => {
    setDownloadingCSV(true);
    try {
      await api.downloadAssetReportCSV();
      showToast?.('CSV report downloaded successfully.', 'success');
    } catch (err) {
      showToast?.(err.message || 'Failed to download CSV report.', 'error');
    } finally {
      setDownloadingCSV(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      await api.downloadAssetReportPDF();
      showToast?.('PDF report downloaded successfully.', 'success');
    } catch (err) {
      showToast?.(err.message || 'Failed to download PDF report.', 'error');
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Reports &amp; Analytics</h2>
          <p className="text-sm text-slate-500">
            Snapshot of inventory, utilization, maintenance, and procurement metrics.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportJson}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
          >
            <FileText className="h-4 w-4" />
            Export JSON
          </button>
        </div>
      </header>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Asset Reports</h3>
        <p className="text-sm text-slate-600 mb-4">
          Download your asset report in CSV or PDF format. The report includes all asset details, status, values, and more.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownloadCSV}
            disabled={downloadingCSV}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingCSV ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Download CSV
              </>
            )}
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingPDF ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PDF
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Note: PDF generation requires the reportlab library to be installed on the server.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ReportCard title="Total assets" value={summary.assetsTotal} subtitle="Across all categories" />
        <ReportCard
          title="Portfolio value"
          value={`₹${summary.totalValue.toLocaleString('en-IN')}`}
          subtitle="Current depreciated value"
        />
        <ReportCard title="Active loans" value={summary.loansActive} subtitle="Pending returns" />
        <ReportCard title="Open maintenance" value={summary.maintenanceOpen} subtitle="Pending approval/completion" />
        <ReportCard title="Pending procurement" value={summary.procurementPending} subtitle="Awaiting approvals" />
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Asset status distribution</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {Object.entries(summary.byStatus).map(([status, count]) => (
            <div
              key={status}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
            >
              <p className="text-xs uppercase font-semibold text-slate-500">
                {status.replace(/_/g, ' ')}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{count}</p>
            </div>
          ))}
          {!Object.keys(summary.byStatus).length ? <p className="text-sm text-slate-500">No assets yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

function ReportCard({ title, value, subtitle }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs uppercase font-semibold text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

