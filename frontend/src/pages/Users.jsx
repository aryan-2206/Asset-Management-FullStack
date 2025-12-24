import { useState } from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'user', label: 'User' },
];

export default function UsersPage({ showToast }) {
  const { data, create, update, remove } = useAppContext();
  const users = data.users || [];
  const [modal, setModal] = useState({ open: false, user: null });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const openModal = (user = null) => setModal({ open: true, user });
  const closeModal = () => setModal({ open: false, user: null });

  const handleSave = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    try {
      if (modal.user) {
        await update('users', modal.user.id, payload);
        showToast('User updated.');
      } else {
        await create('users', payload);
        showToast('User created.');
      }
      closeModal();
    } catch (err) {
      showToast(err.message || 'Failed to save user.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove('users', confirmDelete.id);
      showToast('User deleted.');
    } catch (error) {
      showToast(error.message || 'Failed to delete user.', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500">
            Manage platform access, roles, and contact details.
          </p>
        </div>
        <button
          onClick={() => openModal(null)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
        >
          + Invite User
        </button>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Department</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{user.full_name}</td>
                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                <td className="px-4 py-3 text-slate-600 uppercase font-semibold">{user.role}</td>
                <td className="px-4 py-3 text-slate-600">{user.department || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{user.phone || '—'}</td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button
                    onClick={() => openModal(user)}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(user)}
                    className="text-sm font-semibold text-red-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length ? (
          <div className="py-12 text-center text-sm text-slate-500">No users found.</div>
        ) : null}
      </div>

      <Modal
        title={modal.user ? 'Edit User' : 'Invite User'}
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
              form="user-form"
              className="rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
            >
              Save User
            </button>
          </div>
        }
      >
        <form id="user-form" className="grid gap-4 md:grid-cols-2" onSubmit={handleSave}>
          <Input label="Full name" name="full_name" defaultValue={modal.user?.full_name || ''} required />
          <Input label="Email" name="email" type="email" defaultValue={modal.user?.email || ''} required />
          <SelectField
            label="Role"
            name="role"
            defaultValue={modal.user?.role || 'user'}
            options={ROLES}
          />
          <Input label="Department" name="department" defaultValue={modal.user?.department || ''} />
          <Input label="Phone" name="phone" defaultValue={modal.user?.phone || ''} />
          <Input label="Employee ID" name="employee_id" defaultValue={modal.user?.employee_id || ''} />
        </form>
      </Modal>

      <Modal
        title="Delete User"
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
          Are you sure you want to delete <strong>{confirmDelete?.full_name}</strong>? This will remove
          their access to AssetFlow.
        </p>
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

