import { apiFetch } from './api';

export interface Deal {
  id: string;
  startupName: string;
  industry?: string;
  amount: string;
  equity?: string;
  status: string;
  stage: string;
  notes?: string;
  lastActivity: string;
  entrepreneur?: any;
  investor?: any;
}

const normalizeDeal = (deal: any): Deal => ({
  id: deal.id || deal._id,
  startupName: deal.startupName,
  industry: deal.industry,
  amount: deal.amount,
  equity: deal.equity,
  status: deal.status,
  stage: deal.stage,
  notes: deal.notes,
  lastActivity: deal.lastActivity,
  entrepreneur: deal.entrepreneur,
  investor: deal.investor
});

export const getDeals = async (): Promise<Deal[]> => {
  const res = await apiFetch('/api/deals');
  if (!res.ok) return [];
  const data = await res.json();
  return (data.deals || []).map(normalizeDeal);
};

export const getDealStats = async () => {
  const res = await apiFetch('/api/deals/stats');
  if (!res.ok) return null;
  return res.json();
};

export const createDeal = async (payload: {
  entrepreneurId: string;
  startupName: string;
  industry?: string;
  amount: string;
  equity?: string;
  status?: string;
  stage?: string;
  notes?: string;
}) => {
  const res = await apiFetch('/api/deals', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create deal');
  }
  const data = await res.json();
  return normalizeDeal(data.deal);
};

export const updateDeal = async (id: string, updates: Partial<Deal>) => {
  const res = await apiFetch(`/api/deals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update deal');
  }
  const data = await res.json();
  return normalizeDeal(data.deal);
};
