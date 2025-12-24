import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useAppContext } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const INITIAL_FORM = {
  asset_id: '',
  asset_name: '',
  title: '',
  description: '',
  priority: 'medium',
  status: 'pending',
  scheduled_date: '',
  technician: '',
  notes: '',
};

export default function MaintenancePage({ showToast }) {
  const { data, create, update } = useAppContext();
  const [filters, setFilters] = useState('all');
  const [modal, setModal] = useState({ open: false, request: null });

  const requests = data.maintenances || [];

  const filteredRequests = useMemo(() => {
    if (filters === 'all') return requests;
    return requests.filter((req) => req.status === filters);
  }, [requests, filters]);

  const openModal = (request = null) => setModal({ open: true, request });
  const closeModal = () => setModal({ open: false, request: null });

  const handleSave = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    try {
      if (modal.request) {
        await update('maintenances', modal.request.id, payload);
        showToast('Maintenance request updated.');
      } else {
        await create('maintenances', payload);
        showToast('Maintenance request created.');
      }
      closeModal();
    } catch (err) {
      showToast(err.message || 'Failed to save maintenance request.', 'error');
    }
  };

  const advanceStatus = async (request, status) => {
    try {
      await update('maintenances', request.id, { status });
      showToast(`Maintenance marked as ${status.replace(/_/g, ' ')}.`);
    } catch (err) {
      showToast(err.message || 'Failed to update status.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Maintenance</h2>
          <p className="text-sm text-slate-500">
            Track asset maintenance, repairs, and preventive schedules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filters}
            onChange={(event) => setFilters(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => openModal(null)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
          >
            + New Request
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredRequests.map((request) => (
          <article key={request.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{request.title}</h3>
                <p className="text-xs text-slate-500">
                  {request.asset_name} · {request.asset_id}
                </p>
              </div>
              <StatusBadge status={request.status} />
            </header>
            <p className="text-sm text-slate-600">{request.description}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm text-slate-600">
              <Detail label="Priority" value={request.priority} />
              <Detail
                label="Scheduled"
                value={
                  request.scheduled_date
                    ? format(parseISO(request.scheduled_date), 'PPP')
                    : 'Not scheduled'
                }
              />
              <Detail label="Technician" value={request.technician || 'Unassigned'} />
              <Detail label="Notes" value={request.notes || '—'} />
            </dl>
            <div className="flex justify-between items-center">
              <button
                onClick={() => openModal(request)}
                className="text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                Edit
              </button>
              <div className="flex gap-2">
                {request.status === 'pending' ? (
                  <ActionButton onClick={() => advanceStatus(request, 'approved')}>
                    Approve
                  </ActionButton>
                ) : null}
                {['approved', 'in_progress'].includes(request.status) ? (
                  <ActionButton onClick={() => advanceStatus(request, 'completed')}>
                    Complete
                  </ActionButton>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {!filteredRequests.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          No maintenance requests yet.
        </div>
      ) : null}

      <Modal
        title={modal.request ? 'Edit Maintenance Request' : 'New Maintenance Request'}
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
              form="maintenance-form"
              className="rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
            >
              Save Request
            </button>
          </div>
        }
      >
        <form
          id="maintenance-form"
          className="grid gap-4 md:grid-cols-2"
          onSubmit={handleSave}
        >
          <Input label="Asset Name" name="asset_name" defaultValue={modal.request?.asset_name || ''} required />
          <Input label="Asset ID" name="asset_id" defaultValue={modal.request?.asset_id || ''} required />
          <Input
            label="Title"
            name="title"
            defaultValue={modal.request?.title || ''}
            className="md:col-span-2"
            required
          />
          <Textarea
            label="Description"
            name="description"
            defaultValue={modal.request?.description || ''}
            className="md:col-span-2"
          />
          <SelectField
            label="Priority"
            name="priority"
            defaultValue={modal.request?.priority || 'medium'}
            options={PRIORITIES}
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue={modal.request?.status || 'pending'}
            options={STATUSES}
          />
          <Input
            label="Scheduled Date"
            name="scheduled_date"
            type="date"
            defaultValue={modal.request?.scheduled_date || ''}
          />
          <Input label="Technician" name="technician" defaultValue={modal.request?.technician || ''} />
          <Textarea
            label="Notes"
            name="notes"
            defaultValue={modal.request?.notes || ''}
            className="md:col-span-2"
          />
        </form>
      </Modal>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-700 capitalize">{value || '—'}</dd>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-100 text-amber-600',
    approved: 'bg-sky-100 text-sky-600',
    in_progress: 'bg-blue-100 text-blue-600',
    completed: 'bg-emerald-100 text-emerald-600',
    cancelled: 'bg-slate-200 text-slate-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${map[status] || 'bg-slate-200 text-slate-600'}`}>
      {status?.replace(/_/g, ' ') || 'Unknown'}
    </span>
  );
}

function ActionButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-primary-500 hover:text-primary-600 transition"
    >
      {children}
    </button>
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

function SelectField({ label, name, options, className = '', ...props }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
      <select
        name={name}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

