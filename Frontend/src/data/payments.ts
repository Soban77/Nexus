import { apiFetch } from './api';

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

const normalizeTransaction = (tx: any): Transaction => ({
  id: tx._id || tx.id,
  type: tx.type,
  amount: tx.amount,
  currency: tx.currency,
  status: tx.status,
  createdAt: tx.createdAt
});

export const getPaymentHistory = async (): Promise<Transaction[]> => {
  const res = await apiFetch('/api/payments/history');
  if (!res.ok) return [];
  const data = await res.json();
  return (data.transactions || []).map(normalizeTransaction);
};

export const depositFunds = async (amount: number, currency = 'usd') => {
  const res = await apiFetch('/api/payments/deposit', {
    method: 'POST',
    body: JSON.stringify({ amount, currency })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.details || 'Deposit failed');
  }
  return res.json();
};

export const withdrawFunds = async (amount: number, currency = 'usd') => {
  const res = await apiFetch('/api/payments/withdraw', {
    method: 'POST',
    body: JSON.stringify({ amount, currency })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.details || 'Withdrawal failed');
  }
  return res.json();
};

export const transferFunds = async (toUserId: string, amount: number, currency = 'usd') => {
  const res = await apiFetch('/api/payments/transfer', {
    method: 'POST',
    body: JSON.stringify({ toUserId, amount, currency })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.details || 'Transfer failed');
  }
  return res.json();
};
