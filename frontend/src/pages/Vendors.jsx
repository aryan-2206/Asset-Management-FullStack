import { useState } from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';

const CATEGORIES = ['hardware', 'software', 'services', 'maintenance', 'real_estate', 'utilities', 'other'];
const STATUSES = ['active', 'inactive', 'blacklisted'];

export default function VendorsPage({ showToast }) {
  const { data, create, update, remove } = useAppContext();
  const vendors = data.vendors || [];
  const [modal, setModal] = useState({ open: false, vendor: null });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const openModal = (vendor = null) => setModal({ open: true, vendor });
  const closeModal = () => setModal({ open: false, vendor: null });

  const handleSave = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    payload.rating = Number(payload.rating || 0);
    try {
      if (modal.vendor) {
        await update('vendors', modal.vendor.id, payload);
        showToast('Vendor updated.');
      } else {
        await create('vendors', payload);
        showToast('Vendor added.');
      }
      closeModal();
    } catch (err) {
      showToast(err.message || 'Failed to save vendor.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove('vendors', confirmDelete.id);
      showToast('Vendor deleted.');
    } catch (err) {
      showToast(err.message || 'Failed to delete vendor.', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Vendors</h2>
          <p className="text-sm text-slate-500">
            Track suppliers, contracts, and vendor health scores.
          </p>
        </div>
        <button
          onClick={() => openModal(null)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
        >
          + Add Vendor
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vendors.map((vendor) => (
          <article
            key={vendor.id}
            className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col gap-4"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{vendor.vendor_name}</h3>
                <p className="text-xs text-slate-500">{vendor.category}</p>
              </div>
              <StatusBadge status={vendor.status} />
            </header>
            <dl className="space-y-2 text-sm text-slate-600">
              <Detail label="Contact" value={`${vendor.contact_person || '—'} · ${vendor.phone || '—'}`} />
              <Detail label="Email" value={vendor.email || '—'} />
              <Detail label="Website" value={vendor.website || '—'} />
              <Detail label="Payment terms" value={vendor.payment_terms || '—'} />
              <Detail label="Contract" value={`${vendor.contract_start || '—'} → ${vendor.contract_end || '—'}`} />
              <Detail label="Rating" value={vendor.rating ? `${vendor.rating}/5` : '—'} />
            </dl>
            <p className="text-sm text-slate-600">{vendor.notes || 'No additional notes.'}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => openModal(vendor)}
                className="text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                Edit
              </button>
              <button
                onClick={() => setConfirmDelete(vendor)}
                className="text-sm font-semibold text-red-500 hover:text-red-600"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {!vendors.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          No vendors recorded yet.
        </div>
      ) : null}

      <Modal
        title={modal.vendor ? 'Edit Vendor' : 'Add Vendor'}
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
              form="vendor-form"
              className="rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
            >
              Save Vendor
            </button>
          </div>
        }
      >
        <form id="vendor-form" className="grid gap-4 md:grid-cols-2" onSubmit={handleSave}>
          <Input
            label="Vendor name"
            name="vendor_name"
            defaultValue={modal.vendor?.vendor_name || ''}
            required
          />
          <Input
            label="Contact person"
            name="contact_person"
            defaultValue={modal.vendor?.contact_person || ''}
          />
          <Input label="Email" name="email" type="email" defaultValue={modal.vendor?.email || ''} />
          <Input label="Phone" name="phone" defaultValue={modal.vendor?.phone || ''} />
          <Input label="Website" name="website" defaultValue={modal.vendor?.website || ''} className="md:col-span-2" />
          <SelectField
            label="Category"
            name="category"
            defaultValue={modal.vendor?.category || 'hardware'}
            options={CATEGORIES}
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue={modal.vendor?.status || 'active'}
            options={STATUSES}
          />
          <Input label="Rating (1-5)" name="rating" type="number" min="0" max="5" defaultValue={modal.vendor?.rating || ''} />
          <Input label="Contract start" name="contract_start" type="date" defaultValue={modal.vendor?.contract_start || ''} />
          <Input label="Contract end" name="contract_end" type="date" defaultValue={modal.vendor?.contract_end || ''} />
          <Textarea
            label="Payment terms"
            name="payment_terms"
            defaultValue={modal.vendor?.payment_terms || ''}
            className="md:col-span-2"
          />
          <Textarea
            label="Notes"
            name="notes"
            defaultValue={modal.vendor?.notes || ''}
            className="md:col-span-2"
          />
        </form>
      </Modal>

      <Modal
        title="Delete Vendor"
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="rounded-lg bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
            >
              Delete
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <strong>{confirmDelete?.vendor_name}</strong>? This action
          cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-700">{value || '—'}</dd>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: 'bg-emerald-100 text-emerald-600',
    inactive: 'bg-slate-200 text-slate-600',
    blacklisted: 'bg-red-100 text-red-600',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${
        map[status] || 'bg-slate-200 text-slate-600'
      }`}
    >
      {status?.replace(/_/g, ' ') || 'Unknown'}
    </span>
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
          <option key={option} value={option}>
            {option.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </label>
  );
}

