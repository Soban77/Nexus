import express from 'express';
import Stripe from 'stripe';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' });

// Deposit: charge a card (Stripe test) and record transaction
router.post(
  '/deposit',
  authenticate,
  body('amount').isFloat({ gt: 0 }),
  body('currency').optional().isAlpha().trim().escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { amount, currency = 'usd', metadata = {} } = req.body;

    try {
    const tx = await Transaction.create({
      user: req.user._id,
      type: 'deposit',
      amount,
      currency,
      status: 'Pending',
      metadata
    });

    // Create a PaymentIntent in test mode. Use a test PM to auto-confirm.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      payment_method: 'pm_card_visa',
      confirm: true,
      metadata: { transactionId: tx._id.toString(), ...metadata }
    });

    tx.stripeId = paymentIntent.id;

    if (paymentIntent.status === 'succeeded') {
      tx.status = 'Completed';
    } else {
      tx.status = 'Pending';
    }

    await tx.save();

    return res.json({ transaction: tx, paymentIntent });
  } catch (error) {
    console.error('Deposit error', error);
    const tx = await Transaction.create({
      user: req.user._id,
      type: 'deposit',
      amount,
      currency,
      status: 'Failed',
      error: error.message
    });
    return res.status(500).json({ error: 'Deposit failed', details: error.message, transaction: tx });
  }
});

// Withdraw: simulate a payout in sandbox and record transaction
router.post(
  '/withdraw',
  authenticate,
  body('amount').isFloat({ gt: 0 }),
  body('currency').optional().isAlpha().trim().escape(),
  body('destinationAccountId').optional().isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { amount, currency = 'usd', destinationAccountId } = req.body;

    try {
    const tx = await Transaction.create({
      user: req.user._id,
      type: 'withdraw',
      amount,
      currency,
      status: 'Pending',
      metadata: { destinationAccountId }
    });

    // For sandbox/testing we simulate a successful payout.
    // In production you'd create a Stripe Payout or Transfer to a connected account.
    tx.status = 'Completed';
    tx.stripeId = `sandbox_withdraw_${tx._id}`;
    await tx.save();

    return res.json({ transaction: tx });
  } catch (error) {
    console.error('Withdraw error', error);
    const tx = await Transaction.create({
      user: req.user._id,
      type: 'withdraw',
      amount,
      currency,
      status: 'Failed',
      error: error.message
    });
    return res.status(500).json({ error: 'Withdraw failed', details: error.message, transaction: tx });
  }
});

// Transfer: move between users (debit sender, credit recipient)
router.post(
  '/transfer',
  authenticate,
  body('amount').isFloat({ gt: 0 }),
  body('currency').optional().isAlpha().trim().escape(),
  body('toUserId').isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { amount, currency = 'usd', toUserId } = req.body;

    try {
      const toUser = await User.findById(toUserId);
      if (!toUser) return res.status(404).json({ error: 'Recipient not found' });

      // Create debit transaction for sender
      const debit = await Transaction.create({
        user: req.user._id,
        type: 'transfer',
        amount,
        currency,
        status: 'Pending',
        fromAccount: req.user._id,
        toAccount: toUserId
      });

      // Create credit transaction for recipient
      const credit = await Transaction.create({
        user: toUserId,
        type: 'transfer',
        amount,
        currency,
        status: 'Pending',
        fromAccount: req.user._id,
        toAccount: toUserId
      });

      // In sandbox, we mark both as completed immediately.
      debit.status = 'Completed';
      credit.status = 'Completed';
      debit.stripeId = `sandbox_transfer_${debit._id}`;
      credit.stripeId = `sandbox_transfer_${credit._id}`;

      await debit.save();
      await credit.save();

      return res.json({ debit, credit });
    } catch (error) {
      console.error('Transfer error', error);
      return res.status(500).json({ error: 'Transfer failed', details: error.message });
    }
  }
);

// Transaction history for authenticated user
router.get('/history', authenticate, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [{ user: req.user._id }, { fromAccount: req.user._id }, { toAccount: req.user._id }]
    })
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json({ transactions });
  } catch (error) {
    console.error('History error', error);
    return res.status(500).json({ error: 'Could not fetch history', details: error.message });
  }
});

export default router;
