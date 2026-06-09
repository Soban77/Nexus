import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();

const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const findConflicts = async (userId, startTime, endTime, excludeMeetingId = null) => {
  const query = {
    'participants.user': userId,
    status: { $in: ['pending', 'accepted'] },
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
    ]
  };

  if (excludeMeetingId) {
    query._id = { $ne: excludeMeetingId };
  }

  return Meeting.find(query);
};

const normalizeMeeting = (meeting) => ({
  id: meeting._id,
  title: meeting.title,
  description: meeting.description,
  location: meeting.location,
  status: meeting.status,
  startTime: meeting.startTime,
  endTime: meeting.endTime,
  createdBy: meeting.createdBy,
  externalCalendarId: meeting.externalCalendarId,
  participants: meeting.participants,
  createdAt: meeting.createdAt,
  updatedAt: meeting.updatedAt
});

router.get('/', authenticate, async (req, res) => {
  try {
    const meetings = await Meeting.find({ 'participants.user': req.user._id })
      .sort({ startTime: 1 })
      .populate('createdBy', 'name email role')
      .populate('participants.user', 'name email role');

    return res.json({ meetings: meetings.map(normalizeMeeting) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load meetings', message: error.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  const meetingId = req.params.id;
  if (!mongoose.isValidObjectId(meetingId)) {
    return res.status(400).json({ error: 'Invalid meeting id' });
  }

  try {
    const meeting = await Meeting.findById(meetingId)
      .populate('createdBy', 'name email role')
      .populate('participants.user', 'name email role');

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const isParticipant = meeting.participants.some((p) => p.user._id.equals(req.user._id));
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json({ meeting: normalizeMeeting(meeting) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load meeting', message: error.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  const {
    title,
    description,
    location,
    startTime: rawStart,
    endTime: rawEnd,
    participantIds,
    externalCalendarId
  } = req.body;

  const startTime = parseDate(rawStart);
  const endTime = parseDate(rawEnd);

  if (!title || !startTime || !endTime || !participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
    return res.status(400).json({ error: 'Title, startTime, endTime, and participantIds are required' });
  }

  if (startTime >= endTime) {
    return res.status(400).json({ error: 'endTime must be after startTime' });
  }

  const participantSet = new Set(participantIds.map((id) => id.toString()));
  participantSet.add(req.user._id.toString());

  const users = await User.find({ _id: { $in: Array.from(participantSet) } });
  if (users.length !== participantSet.size) {
    return res.status(400).json({ error: 'One or more participant IDs are invalid' });
  }

  try {
    const conflicts = [];
    for (const participantId of participantSet) {
      const overlap = await findConflicts(participantId, startTime, endTime);
      if (overlap.length > 0) {
        conflicts.push({ participantId, conflictCount: overlap.length });
      }
    }

    if (conflicts.length > 0) {
      return res.status(409).json({
        error: 'Meeting conflict detected',
        conflicts
      });
    }

    const participants = users.map((user) => ({ user: user._id, status: user._id.equals(req.user._id) ? 'accepted' : 'pending' }));
    const meeting = new Meeting({
      title,
      description,
      location,
      startTime,
      endTime,
      createdBy: req.user._id,
      participants,
      status: 'pending',
      externalCalendarId
    });

    await meeting.save();
    await meeting.populate('createdBy', 'name email role').populate('participants.user', 'name email role');

    for (const participant of meeting.participants) {
      if (!participant.user._id.equals(req.user._id)) {
        await createNotification({
          userId: participant.user._id,
          type: 'meeting',
          title: 'Meeting invitation',
          content: `${req.user.name} invited you to "${title}"`,
          fromUserId: req.user._id,
          link: '/meetings'
        });
      }
    }

    return res.status(201).json({ meeting: normalizeMeeting(meeting) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create meeting', message: error.message });
  }
});

const respondToMeeting = async (req, res, action) => {
  const meetingId = req.params.id;
  if (!mongoose.isValidObjectId(meetingId)) {
    return res.status(400).json({ error: 'Invalid meeting id' });
  }

  try {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const participant = meeting.participants.find((p) => p.user.equals(req.user._id));
    if (!participant) {
      return res.status(403).json({ error: 'Only meeting participants can respond' });
    }

    if (meeting.status === 'rejected' || meeting.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot update response for cancelled or rejected meeting' });
    }

    participant.status = action === 'accept' ? 'accepted' : 'rejected';

    if (action === 'reject') {
      meeting.status = 'rejected';
    } else {
      const allAccepted = meeting.participants.every((p) => p.status === 'accepted');
      if (allAccepted) {
        meeting.status = 'accepted';
      }
    }

    await meeting.save();
    await meeting.populate('createdBy', 'name email role').populate('participants.user', 'name email role');
    return res.json({ meeting: normalizeMeeting(meeting) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update meeting response', message: error.message });
  }
};

router.put('/:id/accept', authenticate, (req, res) => respondToMeeting(req, res, 'accept'));
router.put('/:id/reject', authenticate, (req, res) => respondToMeeting(req, res, 'reject'));

export default router;
