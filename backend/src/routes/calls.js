import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  addParticipant,
  getParticipants,
  updateParticipantMedia,
  clearRoom,
  removeParticipant
} from '../utils/callRooms.js';

const router = express.Router();

router.post('/rooms/join', authenticate, (req, res) => {
  const { roomId, socketId } = req.body;
  if (!roomId || !socketId) {
    return res.status(400).json({ error: 'roomId and socketId are required' });
  }

  const participants = addParticipant(roomId, {
    socketId,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    },
    audio: true,
    video: true
  });

  return res.json({ roomId, participants });
});

router.post('/rooms/toggle', authenticate, (req, res) => {
  const { roomId, socketId, audio, video } = req.body;
  if (!roomId || !socketId) {
    return res.status(400).json({ error: 'roomId and socketId are required' });
  }

  const participant = updateParticipantMedia(roomId, socketId, { audio, video });
  if (!participant) {
    return res.status(404).json({ error: 'Participant not found in room' });
  }

  return res.json({ roomId, participant });
});

router.post('/rooms/end', authenticate, (req, res) => {
  const { roomId } = req.body;
  if (!roomId) {
    return res.status(400).json({ error: 'roomId is required' });
  }

  clearRoom(roomId);
  return res.json({ roomId, ended: true });
});

router.get('/rooms/:roomId', authenticate, (req, res) => {
  const { roomId } = req.params;
  return res.json({ roomId, participants: getParticipants(roomId) });
});

router.post('/rooms/leave', authenticate, (req, res) => {
  const { roomId, socketId } = req.body;
  if (!roomId || !socketId) {
    return res.status(400).json({ error: 'roomId and socketId are required' });
  }

  const participants = removeParticipant(roomId, socketId);
  return res.json({ roomId, participants });
});

export default router;
