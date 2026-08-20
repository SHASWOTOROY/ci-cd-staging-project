const API = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  health: () => request('/health'),
  getNotes: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/notes${q ? `?${q}` : ''}`);
  },
  getNote: (id) => request(`/notes/${id}`),
  createNote: (data) => request('/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id, data) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  togglePin: (id) => request(`/notes/${id}/pin`, { method: 'PATCH' }),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
  getNotebooks: () => request('/notebooks'),
  createNotebook: (data) => request('/notebooks', { method: 'POST', body: JSON.stringify(data) }),
  deleteNotebook: (id) => request(`/notebooks/${id}`, { method: 'DELETE' }),
  getLinks: () => request('/links'),
  createLink: (data) => request('/links', { method: 'POST', body: JSON.stringify(data) }),
  updateLink: (id, data) => request(`/links/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLink: (id) => request(`/links/${id}`, { method: 'DELETE' }),
};
