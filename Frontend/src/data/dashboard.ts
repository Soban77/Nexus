import { apiFetch } from './api';

export const getDashboardData = async () => {
  try {
    const res = await apiFetch('/api/dashboard');
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error('Failed to load dashboard', error);
    return null;
  }
};
