import { Document } from '../types';
import { apiFetch } from './api';

export const normalizeDocument = (doc: any): Document => ({
  ...doc,
  id: doc.id || doc._id,
  uploadedAt: doc.uploadedAt || doc.createdAt
});

export const getDocuments = async (): Promise<Document[]> => {
  const res = await apiFetch('/api/documents');
  if (!res.ok) return [];
  const data = await res.json();
  return (data.documents || []).map(normalizeDocument);
};

export const getDocumentsForUser = async (userId: string): Promise<{ documents: Document[]; access: string }> => {
  const res = await apiFetch(`/api/documents/user/${userId}`);
  if (!res.ok) return { documents: [], access: 'restricted' };
  const data = await res.json();
  return {
    documents: (data.documents || []).map(normalizeDocument),
    access: data.access || 'restricted'
  };
};

export const uploadDocument = async (
  file: File,
  status: Document['status'] = 'draft'
): Promise<Document> => {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('status', status);

  const res = await apiFetch('/api/documents/upload', {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }

  const data = await res.json();
  return normalizeDocument(data.document);
};

export const uploadDocumentSignature = async (
  documentId: string,
  signatureFile: File
): Promise<Document> => {
  const formData = new FormData();
  formData.append('signature', signatureFile);

  const res = await apiFetch(`/api/documents/${documentId}/signature`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Signature upload failed');
  }

  const data = await res.json();
  return normalizeDocument(data.document);
};

export const updateDocument = async (
  documentId: string,
  updates: Partial<Pick<Document, 'description' | 'status' | 'version'>>
): Promise<Document> => {
  const res = await apiFetch(`/api/documents/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update document');
  }

  const data = await res.json();
  return normalizeDocument(data.document);
};
