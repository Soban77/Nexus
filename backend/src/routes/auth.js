import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '12', 10);

if (!JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Using insecure default. Set JWT_SECRET in production.');
}

const sanitizeUser = (user) => {
  const safeUser = user.toObject({ getters: true });
  delete safeUser.password;
  delete safeUser.refreshTokens;
  delete safeUser.twoFactor;
  delete safeUser.passwordResetToken;
  delete safeUser.passwordResetExpires;
  safeUser.id = safeUser._id?.toString();
  return safeUser;
};

const createAccessToken = (user) => {
  return jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, JWT_SECRET || 'default_secret', {
    expiresIn: ACCESS_EXPIRES,
    issuer: 'business-nexus',
    audience: process.env.JWT_AUD || 'business-nexus-client'
  });
};

const createRefreshToken = (user) => {
  return jwt.sign({ id: user._id.toString() }, REFRESH_SECRET || (JWT_SECRET || 'default_secret'), {
    expiresIn: REFRESH_EXPIRES,
    issuer: 'business-nexus'
  });
};

async function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Fallback to Ethereal test account
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
}

async function sendOtpEmail(to, otp) {
  try {
    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@business-nexus.example',
      to,
      subject: 'Your verification code',
      text: `Your verification code is: ${otp}`,
      html: `<p>Your verification code is: <strong>${otp}</strong></p>`
    });

    if (nodemailer.getTestMessageUrl && info) {
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.log('OTP preview URL:', preview);
    }
  } catch (err) {
    console.error('Failed to send OTP email', err);
  }
}

router.get('/', (req, res) => {
  res.json({ message: 'Auth route is working' });
});

router.post(
  '/register',
  body('name').trim().isLength({ min: 1 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['entrepreneur', 'investor']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      name,
      email,
      password,
      role,
      startupName,
      pitchSummary,
      fundingNeeded,
      industry,
      location,
      foundedYear,
      teamSize,
      bio
    } = req.body;

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(409).json({ error: 'Email already registered' });

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const profileFields =
        role === 'entrepreneur'
          ? {
              startupName: startupName || `${name.split(' ')[0]}'s Startup`,
              pitchSummary: pitchSummary || '',
              fundingNeeded: fundingNeeded || '',
              industry: industry || 'Technology',
              location: location || '',
              foundedYear: foundedYear || new Date().getFullYear(),
              teamSize: teamSize || 1,
              bio: bio || '',
              currentFundingStage: 'Pre-seed'
            }
          : { bio: bio || '' };

      const newUser = new User({ name, email, password: hashedPassword, role, ...profileFields });
      await newUser.save();

      const accessToken = createAccessToken(newUser);
      const refreshToken = createRefreshToken(newUser);
      newUser.refreshTokens.push(refreshToken);
      await newUser.save();

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7
      });

      return res.status(201).json({ token: accessToken, user: sanitizeUser(newUser) });
    } catch (error) {
      return res.status(500).json({ error: 'Registration failed', message: error.message });
    }
  }
);

router.post(
  '/login',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

      // If 2FA enabled, send OTP and require verification
      if (user.twoFactor && user.twoFactor.enabled) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
        user.twoFactor.otpHash = otpHash;
        user.twoFactor.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await user.save();
        await sendOtpEmail(user.email, otp);
        return res.json({ message: 'OTP sent to registered email. Verify to complete login.' });
      }

      const accessToken = createAccessToken(user);
      const refreshToken = createRefreshToken(user);
      user.refreshTokens.push(refreshToken);
      await user.save();

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7
      });

      return res.json({ token: accessToken, user: sanitizeUser(user) });
    } catch (error) {
      return res.status(500).json({ error: 'Login failed', message: error.message });
    }
  }
);

// Request OTP (public) - useful for enabling 2FA or passwordless flows
router.post('/request-otp', body('email').isEmail().normalizeEmail(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.twoFactor = user.twoFactor || {};
    user.twoFactor.otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
    user.twoFactor.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();
    await sendOtpEmail(user.email, otp);
    return res.json({ message: 'OTP sent' });
  } catch (error) {
    return res.status(500).json({ error: 'Request OTP failed', message: error.message });
  }
});

// Verify OTP and issue tokens
router.post('/verify-otp', body('email').isEmail().normalizeEmail(), body('otp').isLength({ min: 6, max: 6 }), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !user.twoFactor || !user.twoFactor.otpHash) return res.status(400).json({ error: 'Invalid or expired OTP' });
    if (user.twoFactor.otpExpires && user.twoFactor.otpExpires < new Date()) return res.status(400).json({ error: 'OTP expired' });

    const match = await bcrypt.compare(otp, user.twoFactor.otpHash);
    if (!match) return res.status(400).json({ error: 'Invalid OTP' });

    // clear OTP
    user.twoFactor.otpHash = undefined;
    user.twoFactor.otpExpires = undefined;
    // Optionally enable 2FA after verification
    // user.twoFactor.enabled = true;

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7
    });

    return res.json({ token: accessToken, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: 'Verify OTP failed', message: error.message });
  }
});

// Refresh access token using refresh token cookie
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies && req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: 'Refresh token missing' });

    const payload = jwt.verify(token, REFRESH_SECRET || (JWT_SECRET || 'default_secret'));
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'Invalid refresh token' });

    // ensure token exists in DB
    if (!user.refreshTokens || !user.refreshTokens.includes(token)) {
      return res.status(401).json({ error: 'Refresh token revoked' });
    }

    const accessToken = createAccessToken(user);
    return res.json({ token: accessToken });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token', message: error.message });
  }
});

router.post('/request-reset', body('email').isEmail().normalizeEmail(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: 'If that email exists, reset instructions were sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = await bcrypt.hash(resetToken, SALT_ROUNDS);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    try {
      const transporter = await createTransporter();
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@business-nexus.example',
        to: user.email,
        subject: 'Reset your password',
        text: `Reset your password using this link: ${resetUrl}`,
        html: `<p>Reset your password using this link: <a href="${resetUrl}">${resetUrl}</a></p>`
      });
    } catch (mailError) {
      console.log('Password reset token (dev):', resetToken);
      console.log('Password reset URL (dev):', resetUrl);
    }

    return res.json({ message: 'If that email exists, reset instructions were sent' });
  } catch (error) {
    return res.status(500).json({ error: 'Password reset request failed', message: error.message });
  }
});

router.post(
  '/reset-password',
  body('token').isLength({ min: 1 }),
  body('password').isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { token, password } = req.body;
    try {
      const users = await User.find({
        passwordResetExpires: { $gt: new Date() },
        passwordResetToken: { $exists: true, $ne: null }
      });

      let matchedUser = null;
      for (const candidate of users) {
        const isMatch = await bcrypt.compare(token, candidate.passwordResetToken);
        if (isMatch) {
          matchedUser = candidate;
          break;
        }
      }

      if (!matchedUser) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      matchedUser.password = await bcrypt.hash(password, SALT_ROUNDS);
      matchedUser.passwordResetToken = undefined;
      matchedUser.passwordResetExpires = undefined;
      await matchedUser.save();

      return res.json({ message: 'Password reset successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Password reset failed', message: error.message });
    }
  }
);

router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies && req.cookies.refreshToken;
    if (token) {
      try {
        const payload = jwt.verify(token, REFRESH_SECRET || (JWT_SECRET || 'default_secret'));
        await User.findByIdAndUpdate(payload.id, { $pull: { refreshTokens: token } });
      } catch (err) {
        // ignore invalid token removal
      }
    }
    res.clearCookie('refreshToken');
    return res.json({ message: 'Logged out' });
  } catch (error) {
    return res.status(500).json({ error: 'Logout failed', message: error.message });
  }
});

export default router;
