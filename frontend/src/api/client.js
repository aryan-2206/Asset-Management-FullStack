const API_BASE_URL = '/api';

const getAuthEmail = () => localStorage.getItem('authEmail') || '';

async function request(endpoint, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  const email = getAuthEmail();
  if (email) {
    headers.set('X-User-Email', email);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || data.message || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  me: () => request('/user/me'),
  requestOtp: (email) =>
    request('/auth/request_otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  verifyOtp: ({ email, code }) =>
    request('/auth/verify_otp', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
  signup: ({ email, password, full_name }) =>
    request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    }),
  login: ({ email, password }) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: (email) =>
    request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  list: (collection) => request(`/${collection}`),
  create: (collection, payload) =>
    request(`/${collection}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (collection, id, payload) =>
    request(`/${collection}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (collection, id) =>
    request(`/${collection}/${id}`, {
      method: 'DELETE',
    }),
  markAllNotificationsRead: () =>
    request('/notifications/mark_all_read', {
      method: 'PUT',
    }),
  uploadPropertyImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const email = getAuthEmail();
    const headers = new Headers();
    if (email) {
      headers.set('X-User-Email', email);
    }
    // Don't set Content-Type for FormData, browser will set it with boundary
    const response = await fetch(`${API_BASE_URL}/upload/property-image`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || data.message || 'Upload failed');
      error.status = response.status;
      throw error;
    }
    return data;
  },
  downloadAssetReportCSV: async () => {
    const email = getAuthEmail();
    const headers = new Headers();
    if (email) {
      headers.set('X-User-Email', email);
    }
    const response = await fetch(`${API_BASE_URL}/reports/assets/csv`, {
      headers,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to download CSV');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assets_report.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  downloadAssetReportPDF: async () => {
    const email = getAuthEmail();
    const headers = new Headers();
    if (email) {
      headers.set('X-User-Email', email);
    }
    const response = await fetch(`${API_BASE_URL}/reports/assets/pdf`, {
      headers,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to download PDF');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assets_report.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

