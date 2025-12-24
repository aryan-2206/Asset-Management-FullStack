import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useAppContext } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';

const STATUS_LABELS = {
  active: 'Active',
  overdue: 'Overdue',
  returned: 'Returned',
  lost: 'Lost',
};

export default function LoansPage({ showToast }) {
  const { data, update, create } = useAppContext();
  const loans = data.loans || [];
  const assets = data.assets || [];
  const [modal, setModal] = useState({ open: false });

  const enhancedLoans = useMemo(() => {
    return loans.map((loan) => {
      if (loan.status === 'active' && loan.expected_return_date) {
        const dueDate = parseISO(loan.expected_return_date);
        if (dueDate < new Date()) {
          return { ...loan, status: 'overdue' };
        }
      }
      return loan;
    });
  }, [loans]);

  const openModal = () => setModal({ open: true });
  const closeModal = () => setModal({ open: false });

  const handleSave = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    
    // Set default status if not provided
    if (!payload.status) {
      payload.status = 'active';
    }
    
    // Set loan_date to today if not provided
    if (!payload.loan_date) {
      payload.loan_date = new Date().toISOString().split('T')[0];
    }

    try {
      await create('loans', payload);
      showToast('Loan created successfully.');
      closeModal();
    } catch (err) {
      showToast(err.message || 'Failed to create loan.', 'error');
    }
  };

  const markReturned = async (loan) => {
    try {
      await update('loans', loan.id, {
        status: 'returned',
        actual_return_date: new Date().toISOString().split('T')[0],
      });
      showToast('Loan marked as returned.');
    } catch (error) {
      showToast(error.message || 'Failed to update loan.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Asset Loans</h2>
          <p className="text-sm text-slate-500">
            Track issued equipment, due dates, and loan status.
          </p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
        >
          + Add Loan
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {enhancedLoans.map((loan) => (
          <article key={loan.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
            <header className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{loan.asset_name}</h3>
                <p className="text-xs text-slate-500">Loan ID: {loan.id}</p>
              </div>
              <StatusBadge status={loan.status} />
            </header>
            <dl className="grid grid-cols-1 gap-3 text-sm text-slate-600">
              <Detail label="Borrower" value={`${loan.borrower_name} · ${loan.borrower_email}`} />
              <Detail
                label="Loaned on"
                value={loan.loan_date ? format(parseISO(loan.loan_date), 'PPP') : '—'}
              />
              <Detail
                label="Expected return"
                value={
                  loan.expected_return_date
                    ? format(parseISO(loan.expected_return_date), 'PPP')
                    : '—'
                }
                highlight={loan.status === 'overdue'}
              />
              {loan.actual_return_date ? (
                <Detail
                  label="Returned on"
                  value={format(parseISO(loan.actual_return_date), 'PPP')}
                />
              ) : null}
              <Detail label="Purpose" value={loan.purpose || '—'} />
              <Detail label="Notes" value={loan.notes || '—'} />
            </dl>
            {loan.status === 'active' || loan.status === 'overdue' ? (
              <button
                onClick={() => markReturned(loan)}
                className="mt-auto inline-flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold transition shadow-sm"
              >
                Mark as returned
              </button>
            ) : null}
          </article>
        ))}
      </div>

      {!enhancedLoans.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          No loans recorded yet. Click "Add Loan" to create a new loan.
        </div>
      ) : null}

      <Modal
        title="Add Loan"
        open={modal.open}
        onClose={closeModal}
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={closeModal}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="loan-form"
              className="rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
            >
              Create Loan
            </button>
          </div>
        }
      >
        <form id="loan-form" className="grid gap-4 md:grid-cols-2" onSubmit={handleSave}>
          <div className="md:col-span-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">Asset Name</span>
              <select
                name="asset_name"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select an asset</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.name}>
                    {asset.name} {asset.asset_id ? `(${asset.asset_id})` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Input
            label="Borrower Name"
            name="borrower_name"
            required
          />
          <Input
            label="Borrower Email"
            name="borrower_email"
            type="email"
            required
          />
          <Input
            label="Loan Date"
            name="loan_date"
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            required
          />
          <Input
            label="Expected Return Date"
            name="expected_return_date"
            type="date"
            required
          />
          <Input
            label="Purpose"
            name="purpose"
            placeholder="e.g., Project work, Training, etc."
          />
          <div className="md:col-span-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">Status</span>
              <select
                name="status"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                defaultValue="active"
              >
                <option value="active">Active</option>
                <option value="returned">Returned</option>
                <option value="lost">Lost</option>
              </select>
            </label>
          </div>
          <Textarea
            label="Notes"
            name="notes"
            className="md:col-span-2"
            placeholder="Additional notes about the loan..."
          />
        </form>
      </Modal>
    </div>
  );
}

function Input({ label, name, className = '', ...props }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
      <input
        name={name}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        {...props}
      />
    </label>
  );
}

function Textarea({ label, name, className = '', ...props }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
      <textarea
        name={name}
        rows={4}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        {...props}
      />
    </label>
  );
}

function Detail({ label, value, highlight }) {
  return (
    <div>
      <dt className="text-xs uppercase font-semibold text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm ${highlight ? 'text-red-500 font-semibold' : 'text-slate-700'}`}>
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-sky-100 text-sky-600',
    overdue: 'bg-red-100 text-red-600',
    returned: 'bg-emerald-100 text-emerald-600',
    lost: 'bg-slate-200 text-slate-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${styles[status] || 'bg-slate-200 text-slate-600'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

