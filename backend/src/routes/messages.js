import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();

// Get conversation messages between current user and another user
router.get('/:userId', authenticate, async (req, res) => {
  const otherId = req.params.userId;
  if (!mongoose.isValidObjectId(otherId)) return res.status(400).json({ error: 'Invalid user id' });

  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: otherId },
        { sender: otherId, receiver: req.user._id }
      ]
    }).sort({ createdAt: 1 }).populate('sender', 'name avatarUrl').populate('receiver', 'name avatarUrl');

    return res.json({ messages });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load messages', message: error.message });
  }
});

// Get conversation summaries for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const msgs = await Message.find({ $or: [ { sender: req.user._id }, { receiver: req.user._id } ] })
      .sort({ createdAt: -1 })
      .populate('sender', 'name avatarUrl')
      .populate('receiver', 'name avatarUrl');

    // Build conversations map (latest message per partner)
    const convMap = new Map();
    msgs.forEach(m => {
      const partner = m.sender._id.equals(req.user._id) ? String(m.receiver._id) : String(m.sender._id);
      if (!convMap.has(partner)) convMap.set(partner, m);
    });

    const conversations = Array.from(convMap.entries()).map(([partnerId, lastMessage]) => ({
      partnerId,
      lastMessage
    }));

    return res.json({ conversations });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load conversations', message: error.message });
  }
});

// Send a message
router.post('/', authenticate, async (req, res) => {
  const { receiverId, content } = req.body;
  if (!receiverId || !mongoose.isValidObjectId(receiverId)) return res.status(400).json({ error: 'Valid receiverId is required' });
  if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Content is required' });

  try {
    const message = new Message({ sender: req.user._id, receiver: receiverId, content });
    await message.save();
    await message.populate('sender', 'name avatarUrl').populate('receiver', 'name avatarUrl');

    await createNotification({
      userId: receiverId,
      type: 'message',
      title: 'New message',
      content: `${req.user.name} sent you a message`,
      fromUserId: req.user._id,
      link: `/chat/${req.user._id}`
    });

    return res.status(201).json({ message });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send message', message: error.message });
  }
});

export default router;
