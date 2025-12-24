import { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';

const URGENCIES = ['low', 'medium', 'high', 'urgent'].map((value) => ({
  value,
  label: value.replace(/_/g, ' '),
}));

const STATUSES = [
  'pending',
  'manager_approved',
  'admin_approved',
  'rejected',
  'purchased',
  'delivered',
].map((value) => ({
  value,
  label: value.replace(/_/g, ' '),
}));

const INITIAL_FORM = {
  item_name: '',
  category: 'hardware',
  quantity: 1,
  estimated_cost: 0,
  justification: '',
  urgency: 'medium',
  status: 'pending',
};

const CATEGORY_OPTIONS = ['hardware', 'software', 'services', 'furniture', 'other'].map((value) => ({
  value,
  label: value.replace(/_/g, ' '),
}));

export default function ProcurementPage({ showToast }) {
  const { data, create, update } = useAppContext();
  const [filters, setFilters] = useState('all');
  const [modal, setModal] = useState({ open: false, request: null });

  const requests = data.procurements || [];

  const filteredRequests = useMemo(() => {
    if (filters === 'all') return requests;
    return requests.filter((request) => request.status === filters);
  }, [requests, filters]);

  const openModal = (request = null) => setModal({ open: true, request });
  const closeModal = () => setModal({ open: false, request: null });

  const handleSave = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    payload.quantity = Number(payload.quantity || 1);
    payload.estimated_cost = Number(payload.estimated_cost || 0);
    try {
      if (modal.request) {
        await update('procurements', modal.request.id, payload);
        showToast('Procurement request updated.');
      } else {
        await create('procurements', payload);
        showToast('Procurement request created.');
      }
      closeModal();
    } catch (err) {
      showToast(err.message || 'Failed to save procurement request.', 'error');
    }
  };

  const updateStatus = async (request, status) => {
    try {
      await update('procurements', request.id, { status });
      showToast(`Procurement marked as ${status.replace(/_/g, ' ')}.`);
    } catch (err) {
      showToast(err.message || 'Failed to update status.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Procurement</h2>
          <p className="text-sm text-slate-500">
            Manage purchase requests, approvals, and vendor selections.
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
                <h3 className="text-lg font-semibold text-slate-900">{request.item_name}</h3>
                <p className="text-xs text-slate-500 capitalize">
                  {request.category} · Qty {request.quantity}
                </p>
              </div>
              <StatusBadge status={request.status} />
            </header>
            <p className="text-sm text-slate-600">{request.justification || 'No justification provided.'}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm text-slate-600">
              <Detail label="Estimated cost" value={`₹${Number(request.estimated_cost || 0).toLocaleString('en-IN')}`} />
              <Detail label="Total cost" value={`₹${Number(request.total_cost || request.estimated_cost * request.quantity || 0).toLocaleString('en-IN')}`} />
              <Detail label="Urgency" value={request.urgency || '—'} />
              <Detail label="Created by" value={request.created_by || '—'} />
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
                  <ActionButton onClick={() => updateStatus(request, 'manager_approved')}>
                    Manager approve
                  </ActionButton>
                ) : null}
                {request.status === 'manager_approved' ? (
                  <ActionButton onClick={() => updateStatus(request, 'admin_approved')}>
                    Admin approve
                  </ActionButton>
                ) : null}
                {request.status === 'admin_approved' ? (
                  <ActionButton onClick={() => updateStatus(request, 'purchased')}>
                    Mark purchased
                  </ActionButton>
                ) : null}
                {request.status === 'purchased' ? (
                  <ActionButton onClick={() => updateStatus(request, 'delivered')}>
                    Mark delivered
                  </ActionButton>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {!filteredRequests.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          No procurement requests yet.
        </div>
      ) : null}

      <Modal
        title={modal.request ? 'Edit Procurement Request' : 'New Procurement Request'}
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
              form="procurement-form"
              className="rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
            >
              Save Request
            </button>
          </div>
        }
      >
        <form id="procurement-form" className="grid gap-4 md:grid-cols-2" onSubmit={handleSave}>
          <Input label="Item name" name="item_name" defaultValue={modal.request?.item_name || ''} required />
          <SelectField
            label="Category"
            name="category"
            defaultValue={modal.request?.category || 'hardware'}
            options={CATEGORY_OPTIONS}
          />
          <Input label="Quantity" name="quantity" type="number" min="1" defaultValue={modal.request?.quantity || 1} />
          <Input
            label="Estimated cost"
            name="estimated_cost"
            type="number"
            min="0"
            defaultValue={modal.request?.estimated_cost || 0}
          />
          <SelectField
            label="Urgency"
            name="urgency"
            defaultValue={modal.request?.urgency || 'medium'}
            options={URGENCIES}
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue={modal.request?.status || 'pending'}
            options={STATUSES}
          />
          <Textarea
            label="Justification"
            name="justification"
            defaultValue={modal.request?.justification || ''}
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
    manager_approved: 'bg-sky-100 text-sky-600',
    admin_approved: 'bg-indigo-100 text-indigo-600',
    rejected: 'bg-red-100 text-red-600',
    purchased: 'bg-emerald-100 text-emerald-600',
    delivered: 'bg-primary-100 text-primary-600',
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

