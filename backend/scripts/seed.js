import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';

dotenv.config();

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '12', 10);

const demoUsers = [
  {
    name: 'Sarah Chen',
    email: 'sarah@techwave.io',
    password: 'password123',
    role: 'entrepreneur',
    avatarUrl: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
    bio: 'Passionate founder building AI-powered fintech solutions for underserved markets.',
    startupName: 'TechWave AI',
    pitchSummary: 'TechWave AI delivers real-time cash flow forecasting and fraud detection for SMBs using machine learning on banking data.',
    problemStatement: 'Small businesses lose billions annually due to cash flow mismanagement and undetected payment fraud.',
    marketOpportunity: 'The SMB fintech analytics market is projected to reach $12B by 2028 with 18% CAGR in North America.',
    competitiveAdvantage: 'Proprietary ML models trained on 50M+ anonymized transactions with 40% higher fraud detection accuracy than incumbents.',
    fundingNeeded: '$1.5M',
    industry: 'FinTech',
    location: 'San Francisco, CA',
    foundedYear: 2022,
    teamSize: 8,
    valuation: '$8M - $12M',
    previousFunding: '$750K Seed (2022)',
    currentFundingStage: 'Series A',
    fundingTimeline: [
      { stage: 'Pre-seed', status: 'Completed' },
      { stage: 'Seed', status: 'Completed' },
      { stage: 'Series A', status: 'In Progress' }
    ],
    teamMembers: [
      { name: 'Sarah Chen', role: 'Founder & CEO', avatarUrl: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg' },
      { name: 'Alex Johnson', role: 'CTO', avatarUrl: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg' },
      { name: 'Jessica Chen', role: 'Head of Product', avatarUrl: 'https://images.pexels.com/photos/773371/pexels-photo-773371.jpeg' }
    ]
  },
  {
    name: 'Michael Rodriguez',
    email: 'michael@vcinnovate.com',
    password: 'password123',
    role: 'investor',
    avatarUrl: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
    bio: 'Early-stage investor focused on SaaS, FinTech, and HealthTech startups with strong founding teams.',
    investmentInterests: ['FinTech', 'SaaS', 'HealthTech', 'CleanTech'],
    investmentStage: ['Seed', 'Series A'],
    portfolioCompanies: ['CloudScale', 'MediTrack', 'GreenGrid', 'DataPulse'],
    totalInvestments: 12,
    minimumInvestment: '$100K',
    maximumInvestment: '$2M'
  },
  {
    name: 'Alex Rivera',
    email: 'alex@greenlife.io',
    password: 'password123',
    role: 'entrepreneur',
    avatarUrl: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg',
    bio: 'Building sustainable solutions for urban agriculture and food waste reduction.',
    startupName: 'GreenLife Solutions',
    pitchSummary: 'GreenLife deploys modular vertical farming units for restaurants and grocers, cutting food miles and waste by 60%.',
    problemStatement: 'Urban food supply chains waste 30% of produce and consume excessive water in traditional agriculture.',
    marketOpportunity: 'The vertical farming market is expected to grow to $24B by 2030 driven by urbanization and sustainability mandates.',
    competitiveAdvantage: 'Patented hydroponic stack design uses 90% less water and integrates with existing commercial kitchen workflows.',
    fundingNeeded: '$2M',
    industry: 'CleanTech',
    location: 'Austin, TX',
    foundedYear: 2021,
    teamSize: 12,
    valuation: '$10M - $15M',
    previousFunding: '$1.2M Seed (2023)',
    currentFundingStage: 'Series A',
    fundingTimeline: [
      { stage: 'Pre-seed', status: 'Completed' },
      { stage: 'Seed', status: 'Completed' },
      { stage: 'Series A', status: 'In Progress' }
    ],
    teamMembers: [
      { name: 'Alex Rivera', role: 'Founder & CEO', avatarUrl: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg' },
      { name: 'Maria Santos', role: 'COO', avatarUrl: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg' },
      { name: 'David Kim', role: 'Head of Engineering', avatarUrl: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg' },
      { name: 'Emily Watson', role: 'Sustainability Lead', avatarUrl: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg' }
    ]
  },
  {
    name: 'Jennifer Lee',
    email: 'jennifer@healthpulse.vc',
    password: 'password123',
    role: 'investor',
    avatarUrl: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg',
    bio: 'Healthcare-focused angel investor with 15+ years in medical technology.',
    investmentInterests: ['HealthTech', 'BioTech', 'MedTech'],
    investmentStage: ['Pre-seed', 'Seed', 'Series A'],
    portfolioCompanies: ['HealthPulse', 'BioNova', 'CareConnect'],
    totalInvestments: 8,
    minimumInvestment: '$50K',
    maximumInvestment: '$1M'
  }
];

const seed = async () => {
  await connectDB();

  for (const userData of demoUsers) {
    const { password, ...profile } = userData;
    const existing = await User.findOne({ email: userData.email });

    if (existing) {
      await User.findByIdAndUpdate(existing._id, profile, { new: true });
      console.log(`Updated: ${userData.email} (${userData.role})`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await User.create({ ...userData, password: hashedPassword });
    console.log(`Created: ${userData.email} (${userData.role})`);
  }

  console.log('\nDemo accounts ready:');
  console.log('  Entrepreneur: sarah@techwave.io / password123');
  console.log('  Entrepreneur: alex@greenlife.io / password123');
  console.log('  Investor:     michael@vcinnovate.com / password123');
  process.exit(0);
};

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
