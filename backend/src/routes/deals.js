import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';
import Deal from '../models/Deal.js';
import User from '../models/User.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();

const normalizeDeal = (deal) => ({
  id: deal._id,
  investorId: deal.investor?._id || deal.investor,
  entrepreneurId: deal.entrepreneur?._id || deal.entrepreneur,
  startupName: deal.startupName,
  industry: deal.industry,
  amount: deal.amount,
  equity: deal.equity,
  status: deal.status,
  stage: deal.stage,
  notes: deal.notes,
  lastActivity: deal.lastActivity,
  entrepreneur: deal.entrepreneur,
  investor: deal.investor
});

router.get('/', authenticate, async (req, res) => {
  try {
    const filter =
      req.user.role === 'investor'
        ? { investor: req.user._id }
        : { entrepreneur: req.user._id };

    const deals = await Deal.find(filter)
      .sort({ lastActivity: -1 })
      .populate('entrepreneur', 'name avatarUrl startupName industry role')
      .populate('investor', 'name avatarUrl role');

    return res.json({ deals: deals.map(normalizeDeal) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load deals', message: error.message });
  }
});

router.get('/stats', authenticate, authorize(['investor']), async (req, res) => {
  try {
    const deals = await Deal.find({ investor: req.user._id });
    const activeStatuses = ['Due Diligence', 'Term Sheet', 'Negotiation'];
    const activeDeals = deals.filter((deal) => activeStatuses.includes(deal.status));
    const closedThisMonth = deals.filter((deal) => {
      if (deal.status !== 'Closed') return false;
      const now = new Date();
      return (
        deal.lastActivity.getMonth() === now.getMonth() &&
        deal.lastActivity.getFullYear() === now.getFullYear()
      );
    });

    const totalInvestment = deals.reduce((sum, deal) => {
      const numeric = parseFloat(String(deal.amount).replace(/[^0-9.]/g, '')) || 0;
      return sum + numeric;
    }, 0);

    return res.json({
      totalInvestment,
      activeDeals: activeDeals.length,
      portfolioCompanies: deals.filter((deal) => deal.status === 'Closed').length,
      closedThisMonth: closedThisMonth.length
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load deal stats', message: error.message });
  }
});

router.post('/', authenticate, authorize(['investor']), async (req, res) => {
  const { entrepreneurId, startupName, industry, amount, equity, status, stage, notes } = req.body;

  if (!entrepreneurId || !mongoose.isValidObjectId(entrepreneurId)) {
    return res.status(400).json({ error: 'Valid entrepreneurId is required' });
  }
  if (!startupName || !amount) {
    return res.status(400).json({ error: 'startupName and amount are required' });
  }

  try {
    const entrepreneur = await User.findById(entrepreneurId);
    if (!entrepreneur || entrepreneur.role !== 'entrepreneur') {
      return res.status(404).json({ error: 'Entrepreneur not found' });
    }

    const deal = await Deal.create({
      investor: req.user._id,
      entrepreneur: entrepreneurId,
      startupName,
      industry: industry || entrepreneur.industry,
      amount,
      equity,
      status: status || 'Due Diligence',
      stage: stage || 'Seed',
      notes
    });

    await deal.populate('entrepreneur', 'name avatarUrl startupName industry role');
    await deal.populate('investor', 'name avatarUrl role');

    await createNotification({
      userId: entrepreneurId,
      type: 'deal',
      title: 'New investment deal',
      content: `${req.user.name} created a deal for ${startupName}`,
      fromUserId: req.user._id,
      link: '/deals'
    });

    return res.status(201).json({ deal: normalizeDeal(deal) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create deal', message: error.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid deal id' });
  }

  const allowedFields = ['startupName', 'industry', 'amount', 'equity', 'status', 'stage', 'notes'];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }

  try {
    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const isInvestor = deal.investor.equals(req.user._id);
    const isEntrepreneur = deal.entrepreneur.equals(req.user._id);
    if (!isInvestor && !isEntrepreneur) {
      return res.status(403).json({ error: 'Access denied' });
    }

    Object.assign(deal, updates);
    deal.lastActivity = new Date();
    await deal.save();
    await deal.populate('entrepreneur', 'name avatarUrl startupName industry role');
    await deal.populate('investor', 'name avatarUrl role');

    return res.json({ deal: normalizeDeal(deal) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update deal', message: error.message });
  }
});

export default router;
