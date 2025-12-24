import { useState } from 'react';
import { useAppContext } from '../context/AppContext.jsx';

export default function SettingsPage({ user, onUserUpdated, showToast }) {
  const { update } = useAppContext();
  const [formState, setFormState] = useState({
    full_name: user?.full_name || '',
    department: user?.department || '',
    phone: user?.phone || '',
    employee_id: user?.employee_id || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const updated = await update('users', user.id, formState);
      onUserUpdated?.(updated);
      showToast?.('Profile updated.');
    } catch (error) {
      showToast?.(error.message || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Account Settings</h2>
        <p className="text-sm text-slate-500">
          Update your personal details, contact information, and department.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm max-w-2xl">
        <div className="px-6 py-5 space-y-4">
          <Field
            label="Full name"
            name="full_name"
            value={formState.full_name}
            onChange={handleChange}
            required
          />
          <Field label="Email" value={user?.email || ''} disabled />
          <Field
            label="Department"
            name="department"
            value={formState.department}
            onChange={handleChange}
          />
          <Field
            label="Phone"
            name="phone"
            value={formState.phone}
            onChange={handleChange}
          />
          <Field
            label="Employee ID"
            name="employee_id"
            value={formState.employee_id}
            onChange={handleChange}
          />
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
      <input
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-100 disabled:text-slate-500"
        {...props}
      />
    </label>
  );
}

