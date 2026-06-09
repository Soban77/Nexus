import { apiFetch } from './api';

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  location?: string;
  status: string;
  startTime: string;
  endTime: string;
  createdBy: any;
  participants: Array<{ user: any; status: string }>;
}

const normalizeMeeting = (meeting: any): Meeting => ({
  id: meeting.id || meeting._id,
  title: meeting.title,
  description: meeting.description,
  location: meeting.location,
  status: meeting.status,
  startTime: meeting.startTime,
  endTime: meeting.endTime,
  createdBy: meeting.createdBy,
  participants: meeting.participants || []
});

export const getMeetings = async (): Promise<Meeting[]> => {
  const res = await apiFetch('/api/meetings');
  if (!res.ok) return [];
  const data = await res.json();
  return (data.meetings || []).map(normalizeMeeting);
};

export const createMeeting = async (payload: {
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  participantIds: string[];
}) => {
  const res = await apiFetch('/api/meetings', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create meeting');
  }
  const data = await res.json();
  return normalizeMeeting(data.meeting);
};

export const respondToMeeting = async (meetingId: string, action: 'accept' | 'reject') => {
  const res = await apiFetch(`/api/meetings/${meetingId}/${action}`, { method: 'PUT' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update meeting');
  }
  const data = await res.json();
  return normalizeMeeting(data.meeting);
};
