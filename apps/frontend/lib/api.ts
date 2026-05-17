import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({ baseURL: API_URL });

/** Unwrap the standard API envelope { success, data, meta } */
export function unwrap<T>(res: { data: { data?: T; success?: boolean } | T }): T {
  const body = res.data as any;
  // Handle envelope: { success: true, data: {...} }
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return body.data as T;
  }
  return body as T;
}

/** Unwrap and also return meta */
export function unwrapWithMeta<T>(res: { data: any }): { data: T; meta: Record<string, unknown> | undefined } {
  const body = res.data as any;
  if (body && typeof body === 'object' && 'success' in body) {
    return { data: body.data as T, meta: body.meta };
  }
  return { data: body as T, meta: undefined };
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      // Read token from Zustand persisted store key
      const raw = localStorage.getItem('currencyiq-auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        const token = parsed?.state?.token;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // localStorage inaccessible (private browsing, storage quota, etc.)
    }
  }
  return config;
});

export const ratesApi = {
  convert: (from: string, to: string, amount: number) =>
    api.get('/rates/convert', { params: { from, to, amount } }),
  convertMulti: (from: string, to: string, amount: number) =>
    api.get('/rates/convert/multi', { params: { from, to, amount } }),
  history: (from: string, to: string, period: string) =>
    api.get('/rates/history', { params: { from, to, period } }),
  all: (base: string) => api.get('/rates', { params: { base } }),
  refresh: (from: string, to: string) => api.post('/rates/refresh', { from, to }),
};

export const currenciesApi = {
  list: (search?: string) => api.get('/currencies', { params: search ? { search } : {} }),
  get: (code: string) => api.get(`/currencies/${code}`),
};

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (email: string, password: string, full_name?: string) =>
    api.post('/auth/register', { email, password, full_name }),
};

export const keysApi = {
  list: () => api.get('/keys'),
  create: (name?: string) => api.post('/keys', { name }),
  revoke: (id: string) => api.delete(`/keys/${id}`),
  usage: (id: string) => api.get(`/keys/${id}/usage`),
};
