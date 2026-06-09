import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = express.Router();

const normalizeNotification = (notification) => ({
  id: notification._id,
  type: notification.type,
  title: notification.title,
  content: notification.content,
  fromUser: notification.fromUser,
  link: notification.link,
  read: notification.read,
  createdAt: notification.createdAt
});

router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('fromUser', 'name avatarUrl role');

    return res.json({ notifications: notifications.map(normalizeNotification) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load notifications', message: error.message });
  }
});

router.put('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update notifications', message: error.message });
  }
});

router.put('/:id/read', authenticate, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid notification id' });
  }

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { read: true },
      { new: true }
    ).populate('fromUser', 'name avatarUrl role');

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.json({ notification: normalizeNotification(notification) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update notification', message: error.message });
  }
});

export default router;
