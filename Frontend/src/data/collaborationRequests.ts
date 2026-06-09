import { CollaborationRequest } from '../types';
import { API_BASE_URL } from '../config';

const getAuthHeaders = () => {
  const token = localStorage.getItem('business_nexus_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const normalizeRequest = (request: any): CollaborationRequest => ({
  id: request._id || request.id,
  investorId: request.investor?._id || request.investorId,
  entrepreneurId: request.entrepreneur?._id || request.entrepreneurId,
  message: request.message,
  status: request.status,
  createdAt: request.createdAt || request.updatedAt || new Date().toISOString()
});

export const getRequestsForEntrepreneur = async (entrepreneurId: string): Promise<CollaborationRequest[]> => {
  try {
    const res = await fetch(`${API_BASE_URL || ''}/api/collaborations`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.requests || [])
      .map(normalizeRequest)
      .filter((request: CollaborationRequest) => String(request.entrepreneurId) === String(entrepreneurId));
  } catch (error) {
    console.error('Failed to load collaboration requests', error);
    return [];
  }
};

export const getRequestsFromInvestor = async (investorId: string): Promise<CollaborationRequest[]> => {
  try {
    const res = await fetch(`${API_BASE_URL || ''}/api/collaborations`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.requests || [])
      .map(normalizeRequest)
      .filter((request: CollaborationRequest) => String(request.investorId) === String(investorId));
  } catch (error) {
    console.error('Failed to load collaboration requests', error);
    return [];
  }
};

export const createCollaborationRequest = async (investorId: string, entrepreneurId: string, message: string) => {
  try {
    const res = await fetch(`${API_BASE_URL || ''}/api/collaborations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ entrepreneurId, message })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Failed to create collaboration request');
    }
    const data = await res.json();
    return normalizeRequest(data.request);
  } catch (error) {
    console.error('Failed to create collaboration request', error);
    throw error;
  }
};

export const updateRequestStatus = async (requestId: string, newStatus: 'pending' | 'accepted' | 'rejected') => {
  try {
    const res = await fetch(`${API_BASE_URL || ''}/api/collaborations/${requestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Failed to update request');
    }
    const data = await res.json();
    return normalizeRequest(data.request);
  } catch (error) {
    console.error('Failed to update collaboration request', error);
    throw error;
  }
};
