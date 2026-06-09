import { apiFetch } from './api';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string;
  fromUser?: { _id?: string; id?: string; name: string; avatarUrl?: string };
  link?: string;
  read: boolean;
  createdAt: string;
}

const normalizeNotification = (item: any): NotificationItem => ({
  id: item.id || item._id,
  type: item.type,
  title: item.title,
  content: item.content,
  fromUser: item.fromUser,
  link: item.link,
  read: item.read,
  createdAt: item.createdAt
});

export const getNotifications = async (): Promise<NotificationItem[]> => {
  const res = await apiFetch('/api/notifications');
  if (!res.ok) return [];
  const data = await res.json();
  return (data.notifications || []).map(normalizeNotification);
};

export const markAllNotificationsRead = async () => {
  const res = await apiFetch('/api/notifications/read-all', { method: 'PUT' });
  if (!res.ok) throw new Error('Failed to mark notifications as read');
};

export const markNotificationRead = async (id: string) => {
  const res = await apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
  if (!res.ok) throw new Error('Failed to mark notification as read');
  const data = await res.json();
  return normalizeNotification(data.notification);
};
