import { Entrepreneur, Investor } from '../types';
import { API_BASE_URL } from '../config';

const getAuthHeaders = () => {
  const token = localStorage.getItem('business_nexus_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const normalizeUser = (user: any): any => ({
  id: String(user._id || user.id),
  name: user.name,
  email: user.email,
  role: user.role,
  avatarUrl: user.avatarUrl || user.avatar || '',
  bio: user.bio || '',
  isOnline: user.isOnline ?? false,
  createdAt: user.createdAt || user.updatedAt || new Date().toISOString(),
  startupName: user.startupName || '',
  pitchSummary: user.pitchSummary || '',
  fundingNeeded: user.fundingNeeded || '',
  industry: user.industry || '',
  location: user.location || '',
  foundedYear: user.foundedYear,
  teamSize: user.teamSize,
  problemStatement: user.problemStatement || '',
  marketOpportunity: user.marketOpportunity || '',
  competitiveAdvantage: user.competitiveAdvantage || '',
  valuation: user.valuation || '',
  previousFunding: user.previousFunding || '',
  currentFundingStage: user.currentFundingStage || '',
  fundingTimeline: user.fundingTimeline || [],
  teamMembers: user.teamMembers || [],
  startupHistory: user.startupHistory || [],
  investmentInterests: user.investmentInterests || [],
  investmentStage: user.investmentStage || [],
  portfolioCompanies: user.portfolioCompanies || [],
  totalInvestments: user.totalInvestments,
  minimumInvestment: user.minimumInvestment,
  maximumInvestment: user.maximumInvestment
});

export const getUsersByRole = async (role: 'entrepreneur' | 'investor'): Promise<(Entrepreneur | Investor)[]> => {
  try {
    const res = await fetch(`${API_BASE_URL || ''}/api/users/public?role=${role}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.users || []).map(normalizeUser);
  } catch (error) {
    console.error('Failed to load users by role', error);
    return [];
  }
};

export const findUserById = async (id: string) => {
  if (!id) return null;
  try {
    const res = await fetch(`${API_BASE_URL || ''}/api/users/${id}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return normalizeUser(data.user);
  } catch (error) {
    console.error('Failed to load user', error);
    return null;
  }
};
