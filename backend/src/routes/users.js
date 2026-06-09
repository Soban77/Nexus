import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';
import User from '../models/User.js';

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '12', 10);

const router = express.Router();

const sanitizeUser = (user) => {
  const safeUser = user.toObject({ getters: true });
  delete safeUser.password;
  safeUser.id = safeUser._id?.toString();
  return safeUser;
};

router.get('/me', authenticate, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

router.put(
  '/me/password',
  authenticate,
  body('currentPassword').isLength({ min: 1 }),
  body('newPassword').isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });

      user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await user.save();
      return res.json({ message: 'Password updated successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update password', message: error.message });
    }
  }
);

router.put('/me', authenticate, async (req, res) => {
  const allowedFields = [
    'name',
    'avatarUrl',
    'bio',
    'preferences',
    'startupName',
    'pitchSummary',
    'fundingNeeded',
    'industry',
    'location',
    'foundedYear',
    'teamSize',
    'problemStatement',
    'marketOpportunity',
    'competitiveAdvantage',
    'valuation',
    'previousFunding',
    'currentFundingStage',
    'fundingTimeline',
    'teamMembers',
    'investmentInterests',
    'investmentStage',
    'portfolioCompanies',
    'totalInvestments',
    'minimumInvestment',
    'maximumInvestment',
    'startupHistory',
    'investmentHistory'
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid profile fields provided' });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    }).select('-password');

    return res.json({ user: sanitizeUser(updatedUser) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update profile', message: error.message });
  }
});

// Public listing (by role) - does not require authentication
// Must be defined BEFORE /:id route to avoid matching conflict
router.get('/public', async (req, res) => {
  try {
    const role = req.query.role;
    const filter = {};
    if (role) filter.role = role;
    const users = await User.find(filter).select('-password');
    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to list users', message: error.message });
  }
});

// List all users (restricted to investors)
router.get('/', authenticate, authorize(['investor']), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to list users', message: error.message });
  }
});

// Get single user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load profile', message: error.message });
  }
});

export default router;
