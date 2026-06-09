import React, { useEffect, useState } from 'react';
import { Calendar, Plus, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { createMeeting, getMeetings, respondToMeeting, Meeting } from '../../data/meetings';
import { getUsersByRole } from '../../data/users';

export const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    participantId: ''
  });

  const loadMeetings = async () => {
    const data = await getMeetings();
    setMeetings(data);
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  useEffect(() => {
    const loadContacts = async () => {
      if (!user) return;
      const role = user.role === 'investor' ? 'entrepreneur' : 'investor';
      const users = await getUsersByRole(role);
      setContacts(users.filter((u: any) => u.id !== user.id));
    };
    loadContacts();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.participantId) {
      toast.error('Select a participant');
      return;
    }

    try {
      await createMeeting({
        title: form.title,
        description: form.description,
        location: form.location,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        participantIds: [form.participantId]
      });
      toast.success('Meeting scheduled');
      setShowForm(false);
      setForm({ title: '', description: '', location: '', startTime: '', endTime: '', participantId: '' });
      await loadMeetings();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleRespond = async (meetingId: string, action: 'accept' | 'reject') => {
    try {
      await respondToMeeting(meetingId, action);
      toast.success(action === 'accept' ? 'Meeting accepted' : 'Meeting declined');
      await loadMeetings();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const getMyParticipantStatus = (meeting: Meeting) => {
    const participant = meeting.participants.find((p) => {
      const userId = p.user?._id || p.user?.id;
      return String(userId) === String(user?.id);
    });
    return participant?.status;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600">Schedule and manage your meetings</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowForm((prev) => !prev)}>
          Schedule Meeting
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">New Meeting</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required fullWidth />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Participant</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.participantId}
                  onChange={(e) => setForm({ ...form, participantId: e.target.value })}
                  required
                >
                  <option value="">Select participant</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} {contact.startupName ? `(${contact.startupName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <Input label="Start" type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required fullWidth />
              <Input label="End" type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required fullWidth />
              <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} fullWidth />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Create Meeting</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="space-y-4">
        {meetings.length === 0 ? (
          <Card>
            <CardBody className="text-center py-10 text-gray-500">
              <Calendar size={40} className="mx-auto mb-3 text-gray-400" />
              No meetings scheduled yet
            </CardBody>
          </Card>
        ) : (
          meetings.map((meeting) => {
            const myStatus = getMyParticipantStatus(meeting);
            const isPendingInvite = myStatus === 'pending';

            return (
              <Card key={meeting.id}>
                <CardBody className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-gray-900">{meeting.title}</h3>
                      <Badge variant={meeting.status === 'accepted' ? 'success' : meeting.status === 'rejected' ? 'error' : 'warning'}>
                        {meeting.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{meeting.description || 'No description'}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {format(new Date(meeting.startTime), 'PPp')} - {format(new Date(meeting.endTime), 'p')}
                    </p>
                    {meeting.location && <p className="text-sm text-gray-500">{meeting.location}</p>}
                  </div>

                  {isPendingInvite && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" leftIcon={<Check size={16} />} onClick={() => handleRespond(meeting.id, 'accept')}>
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" leftIcon={<X size={16} />} onClick={() => handleRespond(meeting.id, 'reject')}>
                        Decline
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
