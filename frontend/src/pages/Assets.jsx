import { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';

const CATEGORIES = [
  { value: 'computer', label: 'Computer' },
  { value: 'mobile_device', label: 'Mobile Device' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'software_license', label: 'Software License' },
  { value: 'office_equipment', label: 'Office Equipment' },
  { value: 'machinery', label: 'Machinery' },
  { value: 'networking', label: 'Networking' },
  { value: 'other', label: 'Other' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'in_maintenance', label: 'In Maintenance' },
  { value: 'retired', label: 'Retired' },
  { value: 'lost', label: 'Lost' },
  { value: 'in_storage', label: 'In Storage' },
];

const INITIAL_FORM = {
  name: '',
  asset_id: '',
  category: 'computer',
  status: 'active',
  purchase_date: '',
  purchase_value: '',
  current_value: '',
  serial_number: '',
  manufacturer: '',
  warranty_expiry: '',
  assigned_to_email: '',
  owner_email: '',
  location: '',
  notes: '',
};

export default function AssetsPage({ showToast, currentUser }) {
  const { data, create, update, remove } = useAppContext();
  const [filters, setFilters] = useState({ search: '', category: 'all', status: 'all' });
  const [view, setView] = useState('table');
  const [modal, setModal] = useState({ open: false, asset: null });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const assets = data.assets || [];

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesCategory = filters.category === 'all' || asset.category === filters.category;
      const matchesStatus = filters.status === 'all' || asset.status === filters.status;
      const matchesSearch =
        !filters.search ||
        [asset.name, asset.asset_id, asset.serial_number, asset.assigned_to_email]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(filters.search.toLowerCase()));
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [assets, filters]);

  const openModal = (asset = null) => {
    setModal({ open: true, asset });
  };

  const closeModal = () => {
    setModal({ open: false, asset: null });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.purchase_value = Number(payload.purchase_value || 0);
    payload.current_value = Number(payload.current_value || 0);
    try {
      if (modal.asset) {
        await update('assets', modal.asset.id, payload);
        showToast('Asset updated successfully.');
      } else {
        await create('assets', payload);
        showToast('Asset created successfully.');
      }
      closeModal();
    } catch (err) {
      showToast(err.message || 'Failed to save asset.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove('assets', confirmDelete.id);
      showToast('Asset deleted.');
    } catch (err) {
      showToast(err.message || 'Failed to delete asset.', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Assets</h2>
          <p className="text-sm text-slate-500">
            Manage hardware, software, furniture, and other organizational assets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 p-1">
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                view === 'table' ? 'bg-primary-600 text-white' : 'text-slate-600'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                view === 'grid' ? 'bg-primary-600 text-white' : 'text-slate-600'
              }`}
            >
              Cards
            </button>
          </div>
          <button
            onClick={() => openModal(null)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
          >
            + Add Asset
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Search by asset name, ID, serial number, or assignee"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Category</label>
            <select
              value={filters.category}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, category: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All</option>
              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All</option>
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {view === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Asset</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Assigned To</th>
                <th className="px-4 py-3 text-left">Current Value</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{asset.name}</div>
                    <div className="text-xs text-slate-500">Asset ID: {asset.asset_id}</div>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">
                    {asset.category?.replace(/_/g, ' ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={asset.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{asset.assigned_to_email || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    ₹{Number(asset.current_value || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => openModal(asset)}
                      className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(asset)}
                      className="text-sm font-semibold text-red-500 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredAssets.length ? (
            <div className="py-12 text-center text-sm text-slate-500">No assets found.</div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{asset.name}</h3>
                  <p className="text-xs text-slate-500">{asset.asset_id}</p>
                </div>
                <StatusPill status={asset.status} />
              </div>
              <dl className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <dt>Category</dt>
                  <dd className="capitalize">{asset.category?.replace(/_/g, ' ') || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Assigned to</dt>
                  <dd>{asset.assigned_to_email || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Location</dt>
                  <dd>{asset.location || '—'}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>Current value</dt>
                  <dd>₹{Number(asset.current_value || 0).toLocaleString('en-IN')}</dd>
                </div>
              </dl>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => openModal(asset)}
                  className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(asset)}
                  className="text-sm font-semibold text-red-500 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        title={modal.asset ? 'Edit Asset' : 'Add New Asset'}
        open={modal.open}
        onClose={closeModal}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="asset-form"
              className="rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
            >
              Save Asset
            </button>
          </div>
        }
      >
        <form id="asset-form" className="grid gap-4 md:grid-cols-2" onSubmit={handleSave}>
          <Input label="Asset Name" name="name" defaultValue={modal.asset?.name || ''} required />
          <Input label="Asset ID" name="asset_id" defaultValue={modal.asset?.asset_id || ''} required />
          <SelectField
            label="Category"
            name="category"
            defaultValue={modal.asset?.category || 'computer'}
            options={CATEGORIES}
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue={modal.asset?.status || 'active'}
            options={STATUSES}
          />
          <Input label="Purchase Date" name="purchase_date" type="date" defaultValue={modal.asset?.purchase_date || ''} />
          <Input label="Warranty Expiry" name="warranty_expiry" type="date" defaultValue={modal.asset?.warranty_expiry || ''} />
          <Input
            label="Purchase Value"
            name="purchase_value"
            type="number"
            min="0"
            defaultValue={modal.asset?.purchase_value || ''}
          />
          <Input
            label="Current Value"
            name="current_value"
            type="number"
            min="0"
            defaultValue={modal.asset?.current_value || ''}
          />
          <Input label="Serial Number" name="serial_number" defaultValue={modal.asset?.serial_number || ''} />
          <Input label="Manufacturer" name="manufacturer" defaultValue={modal.asset?.manufacturer || ''} />
          <Input
            label="Assigned To (Email)"
            name="assigned_to_email"
            type="email"
            defaultValue={modal.asset?.assigned_to_email || currentUser?.email || ''}
          />
          <Input
            label="Owner Email"
            name="owner_email"
            type="email"
            defaultValue={modal.asset?.owner_email || currentUser?.email || ''}
          />
          <Input label="Location" name="location" defaultValue={modal.asset?.location || ''} />
          <Textarea
            label="Notes"
            name="notes"
            defaultValue={modal.asset?.notes || ''}
            className="md:col-span-2"
          />
        </form>
      </Modal>

      <Modal
        title="Delete Asset"
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
            >
              Delete
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <strong>{confirmDelete?.name}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function StatusPill({ status }) {
  const styleMap = {
    active: 'bg-emerald-100 text-emerald-600',
    in_maintenance: 'bg-amber-100 text-amber-600',
    retired: 'bg-slate-200 text-slate-700',
    lost: 'bg-red-100 text-red-600',
    in_storage: 'bg-sky-100 text-sky-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${styleMap[status] || 'bg-slate-200 text-slate-600'}`}>
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
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        rows={4}
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

