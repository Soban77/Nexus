import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const user = req.user;

  if (user.role === 'entrepreneur') {
    return res.json({
      dashboardType: 'entrepreneur',
      profile: {
        name: user.name,
        startupName: user.startupName,
        pitchSummary: user.pitchSummary,
        fundingNeeded: user.fundingNeeded,
        industry: user.industry,
        location: user.location,
        foundedYear: user.foundedYear,
        teamSize: user.teamSize,
        bio: user.bio,
        preferences: user.preferences || []
      },
      insights: {
        recommendedInvestors: user.preferences || [],
        totalConnections: user.portfolioCompanies?.length || 0,
        recentActivity: [
          'Profile updated recently',
          'Investor outreach pending',
          'Pitch deck ready for review'
        ]
      }
    });
  }

  return res.json({
    dashboardType: 'investor',
    profile: {
      name: user.name,
      investmentInterests: user.investmentInterests,
      investmentStage: user.investmentStage,
      portfolioCompanies: user.portfolioCompanies,
      totalInvestments: user.totalInvestments,
      minimumInvestment: user.minimumInvestment,
      maximumInvestment: user.maximumInvestment,
      bio: user.bio,
      preferences: user.preferences || []
    },
    insights: {
      suggestedStartups: user.preferences || [],
      activeDeals: user.portfolioCompanies?.length || 0,
      recentActivity: [
        'New deal opportunities available',
        'Investor network growth trending up',
        'Portfolio review scheduled'
      ]
    }
  });
});

export default router;
