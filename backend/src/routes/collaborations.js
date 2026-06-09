import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';
import CollaborationRequest from '../models/CollaborationRequest.js';
import User from '../models/User.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();

// List collaboration requests related to the current user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const requests = await CollaborationRequest.find({
      $or: [ { investor: userId }, { entrepreneur: userId } ]
    }).sort({ createdAt: -1 }).populate('investor', 'name email role').populate('entrepreneur', 'name email role');

    return res.json({ requests });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load collaboration requests', message: error.message });
  }
});

// Create a new collaboration request (investor -> entrepreneur)
router.post('/', authenticate, authorize(['investor']), async (req, res) => {
  const { entrepreneurId, message } = req.body;
  if (!entrepreneurId || !mongoose.isValidObjectId(entrepreneurId)) {
    return res.status(400).json({ error: 'Valid entrepreneurId is required' });
  }

  try {
    const entrepreneur = await User.findById(entrepreneurId);
    if (!entrepreneur) return res.status(404).json({ error: 'Entrepreneur not found' });

    const request = new CollaborationRequest({
      investor: req.user._id,
      entrepreneur: entrepreneur._id,
      message: message || '',
      createdBy: req.user._id
    });

    await request.save();
    await request.populate('investor', 'name email role').populate('entrepreneur', 'name email role');

    await createNotification({
      userId: entrepreneur._id,
      type: 'investment',
      title: 'New collaboration request',
      content: `${req.user.name} is interested in your startup`,
      fromUserId: req.user._id,
      link: '/dashboard/entrepreneur'
    });

    return res.status(201).json({ request });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create collaboration request', message: error.message });
  }
});

// Update request status (entrepreneur can accept/reject)
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
  if (!['pending', 'accepted', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const request = await CollaborationRequest.findById(id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // Only entrepreneur (recipient) or the original investor can update status
    if (!request.entrepreneur.equals(req.user._id) && !request.investor.equals(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    request.status = status;
    await request.save();
    await request.populate('investor', 'name email role').populate('entrepreneur', 'name email role');

    const notifyUserId = request.investor._id;
    const statusLabel = status === 'accepted' ? 'accepted' : 'declined';
    await createNotification({
      userId: notifyUserId,
      type: 'connection',
      title: 'Collaboration request update',
      content: `Your collaboration request was ${statusLabel}`,
      fromUserId: req.user._id,
      link: '/dashboard/investor'
    });

    return res.json({ request });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update request', message: error.message });
  }
});

export default router;
