import { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';
import { api } from '../api/client.js';
import { Image as ImageIcon, X, Eye } from 'lucide-react';

const PROPERTY_TYPES = [
  'office',
  'warehouse',
  'retail',
  'manufacturing',
  'land',
  'residential',
  'data_center',
  'other',
];
const OWNERSHIP = ['owned', 'leased', 'rented'];
const STATUSES = ['active', 'vacant', 'under_renovation', 'for_sale', 'retired'];

export default function PropertiesPage({ showToast }) {
  const { data, create, update, remove } = useAppContext();
  const properties = data.properties || [];
  const [modal, setModal] = useState({ open: false, property: null });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [detailsModal, setDetailsModal] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const openModal = (property = null) => {
    setModal({ open: true, property });
    setImagePreview(property?.image_url || null);
  };
  const closeModal = () => {
    setModal({ open: false, property: null });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB.', 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const result = await api.uploadPropertyImage(file);
      setImagePreview(result.url);
      showToast('Image uploaded successfully.');
    } catch (err) {
      showToast(err.message || 'Failed to upload image.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    payload.size_sqft = Number(payload.size_sqft || 0);
    payload.monthly_cost = Number(payload.monthly_cost || 0);
    payload.price = Number(payload.price || 0);
    
    // Include image URL if uploaded
    if (imagePreview) {
      payload.image_url = imagePreview;
    }

    try {
      if (modal.property) {
        await update('properties', modal.property.id, payload);
        showToast('Property updated.');
      } else {
        await create('properties', payload);
        showToast('Property added.');
      }
      closeModal();
    } catch (err) {
      showToast(err.message || 'Failed to save property.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove('properties', confirmDelete.id);
      showToast('Property deleted.');
    } catch (err) {
      showToast(err.message || 'Failed to delete property.', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Properties</h2>
          <p className="text-sm text-slate-500">
            Manage owned or leased facilities, warehouses, and offices.
          </p>
        </div>
        <button
          onClick={() => openModal(null)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
        >
          + Add Property
        </button>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <article
            key={property.id}
            className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition"
          >
            {property.image_url ? (
              <div
                className="relative h-48 bg-slate-100 cursor-pointer group"
                onClick={() => setDetailsModal(property)}
              >
                <img
                  src={property.image_url}
                  alt={property.property_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden absolute inset-0 bg-slate-200 items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-slate-400" />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition bg-white/90 rounded-full p-2">
                    <Eye className="h-5 w-5 text-slate-700" />
                  </div>
                </div>
                {property.price && (
                  <div className="absolute top-3 right-3 bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    ₹{Number(property.price).toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            ) : (
              <div
                className="relative h-48 bg-slate-100 cursor-pointer group flex items-center justify-center"
                onClick={() => setDetailsModal(property)}
              >
                <ImageIcon className="h-16 w-16 text-slate-300" />
                {property.price && (
                  <div className="absolute top-3 right-3 bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    ₹{Number(property.price).toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            )}
            <div className="p-5 flex flex-col gap-4 flex-1">
              <header className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{property.property_name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {property.address}, {property.city}
                  </p>
                </div>
                <StatusBadge status={property.status} />
              </header>
              <dl className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                <Detail label="Type" value={property.property_type} />
                <Detail label="Ownership" value={property.ownership_type} />
                <Detail label="Size (sq ft)" value={property.size_sqft || '—'} />
                <Detail
                  label="Monthly cost"
                  value={
                    property.monthly_cost
                      ? `₹${Number(property.monthly_cost).toLocaleString('en-IN')}`
                      : '—'
                  }
                />
              </dl>
              <div className="flex justify-end gap-3 mt-auto pt-2">
                <button
                  onClick={() => setDetailsModal(property)}
                  className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                >
                  View Details
                </button>
                <button
                  onClick={() => openModal(property)}
                  className="text-sm font-semibold text-slate-600 hover:text-slate-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(property)}
                  className="text-sm font-semibold text-red-500 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {!properties.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          No properties recorded yet.
        </div>
      ) : null}

      <Modal
        title={modal.property ? 'Edit Property' : 'Add Property'}
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
              form="property-form"
              className="rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
            >
              Save Property
            </button>
          </div>
        }
      >
        <form id="property-form" className="grid gap-4 md:grid-cols-2" onSubmit={handleSave}>
          <Input
            label="Property name"
            name="property_name"
            defaultValue={modal.property?.property_name || ''}
            required
          />
          <SelectField
            label="Property type"
            name="property_type"
            defaultValue={modal.property?.property_type || 'office'}
            options={PROPERTY_TYPES}
          />
          <Textarea
            label="Address"
            name="address"
            defaultValue={modal.property?.address || ''}
            className="md:col-span-2"
          />
          <Input label="City" name="city" defaultValue={modal.property?.city || ''} />
          <Input label="State" name="state" defaultValue={modal.property?.state || ''} />
          <Input label="Postal code" name="postal_code" defaultValue={modal.property?.postal_code || ''} />
          <Input label="Country" name="country" defaultValue={modal.property?.country || 'India'} />
          <Input
            label="Size (sq ft)"
            name="size_sqft"
            type="number"
            min="0"
            defaultValue={modal.property?.size_sqft || ''}
          />
          <SelectField
            label="Ownership"
            name="ownership_type"
            defaultValue={modal.property?.ownership_type || 'owned'}
            options={OWNERSHIP}
          />
          <Input label="Lease expiry" name="lease_expiry" type="date" defaultValue={modal.property?.lease_expiry || ''} />
          <Input label="Property manager" name="property_manager" defaultValue={modal.property?.property_manager || ''} />
          <SelectField
            label="Status"
            name="status"
            defaultValue={modal.property?.status || 'active'}
            options={STATUSES}
          />
          <Input
            label="Monthly cost"
            name="monthly_cost"
            type="number"
            min="0"
            defaultValue={modal.property?.monthly_cost || ''}
          />
          <Input
            label="Price"
            name="price"
            type="number"
            min="0"
            defaultValue={modal.property?.price || ''}
            placeholder="Total property value"
          />
          <div className="md:col-span-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">Property Image</span>
              <div className="space-y-2">
                {imagePreview && (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-32 w-32 object-cover rounded-lg border border-slate-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                />
                {uploadingImage && (
                  <p className="text-xs text-slate-500">Uploading image...</p>
                )}
                <p className="text-xs text-slate-400">Upload a property image (max 5MB)</p>
              </div>
            </label>
          </div>
          <Textarea
            label="Notes"
            name="notes"
            defaultValue={modal.property?.notes || ''}
            className="md:col-span-2"
          />
        </form>
      </Modal>

      <Modal
        title="Property Details"
        open={!!detailsModal}
        onClose={() => setDetailsModal(null)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                if (detailsModal) {
                  setDetailsModal(null);
                  openModal(detailsModal);
                }
              }}
              className="rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
            >
              Edit Property
            </button>
            <button
              onClick={() => setDetailsModal(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Close
            </button>
          </div>
        }
      >
        {detailsModal && (
          <div className="space-y-6">
            {detailsModal.image_url && (
              <div className="rounded-lg overflow-hidden">
                <img
                  src={detailsModal.image_url}
                  alt={detailsModal.property_name}
                  className="w-full h-64 object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <Detail label="Property Name" value={detailsModal.property_name} />
              <Detail label="Type" value={detailsModal.property_type} />
              <Detail label="Status" value={detailsModal.status} />
              <Detail label="Ownership" value={detailsModal.ownership_type} />
              <Detail label="Address" value={detailsModal.address} />
              <Detail label="City" value={detailsModal.city} />
              <Detail label="State" value={detailsModal.state} />
              <Detail label="Postal Code" value={detailsModal.postal_code} />
              <Detail label="Country" value={detailsModal.country} />
              <Detail label="Size (sq ft)" value={detailsModal.size_sqft || '—'} />
              <Detail label="Property Manager" value={detailsModal.property_manager || '—'} />
              <Detail label="Lease Expiry" value={detailsModal.lease_expiry || '—'} />
              <Detail
                label="Monthly Cost"
                value={
                  detailsModal.monthly_cost
                    ? `₹${Number(detailsModal.monthly_cost).toLocaleString('en-IN')}`
                    : '—'
                }
              />
              <Detail
                label="Price"
                value={
                  detailsModal.price
                    ? `₹${Number(detailsModal.price).toLocaleString('en-IN')}`
                    : '—'
                }
              />
            </div>
            {detailsModal.notes && (
              <div>
                <Detail label="Notes" value={detailsModal.notes} />
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="Delete Property"
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
          Are you sure you want to delete <strong>{confirmDelete?.property_name}</strong>? This action cannot be undone.
        </p>
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
    active: 'bg-emerald-100 text-emerald-600',
    vacant: 'bg-amber-100 text-amber-600',
    under_renovation: 'bg-sky-100 text-sky-600',
    for_sale: 'bg-indigo-100 text-indigo-600',
    retired: 'bg-slate-200 text-slate-600',
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

