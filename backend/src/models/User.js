import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['entrepreneur', 'investor'], required: true },
  avatarUrl: { type: String },
  bio: { type: String },
  preferences: { type: [String], default: [] },
  startupName: { type: String },
  pitchSummary: { type: String },
  fundingNeeded: { type: String },
  industry: { type: String },
  location: { type: String },
  foundedYear: { type: Number },
  teamSize: { type: Number },
  problemStatement: { type: String },
  marketOpportunity: { type: String },
  competitiveAdvantage: { type: String },
  valuation: { type: String },
  previousFunding: { type: String },
  currentFundingStage: { type: String },
  fundingTimeline: {
    type: [{ stage: String, status: String }],
    default: []
  },
  teamMembers: {
    type: [{ name: String, role: String, avatarUrl: String }],
    default: []
  },
  investmentInterests: { type: [String], default: [] },
  investmentStage: { type: [String], default: [] },
  portfolioCompanies: { type: [String], default: [] },
  totalInvestments: { type: Number, default: 0 },
  minimumInvestment: { type: String },
  maximumInvestment: { type: String },
  startupHistory: { type: [String], default: [] },
  investmentHistory: {
    type: [
      {
        company: String,
        amount: String,
        stage: String,
        year: Number
      }
    ],
    default: []
  },
  refreshTokens: { type: [String], default: [] },
  twoFactor: {
    enabled: { type: Boolean, default: false },
    otpHash: { type: String },
    otpExpires: { type: Date }
  },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

export default User;
