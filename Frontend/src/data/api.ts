import { API_BASE_URL } from '../config';

export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('business_nexus_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> | undefined)
  };

  const response = await fetch(`${API_BASE_URL || ''}${path}`, {
    ...options,
    headers
  });

  return response;
};
