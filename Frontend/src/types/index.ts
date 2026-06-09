export type UserRole = 'entrepreneur' | 'investor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  bio: string;
  isOnline?: boolean;
  createdAt: string;
}

export interface TeamMember {
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface FundingRound {
  stage: string;
  status: string;
}

export interface Entrepreneur extends User {
  role: 'entrepreneur';
  startupName: string;
  pitchSummary: string;
  fundingNeeded: string;
  industry: string;
  location: string;
  foundedYear: number;
  teamSize: number;
  problemStatement?: string;
  marketOpportunity?: string;
  competitiveAdvantage?: string;
  valuation?: string;
  previousFunding?: string;
  currentFundingStage?: string;
  fundingTimeline?: FundingRound[];
  teamMembers?: TeamMember[];
  startupHistory?: string[];
}

export interface Investor extends User {
  role: 'investor';
  investmentInterests: string[];
  investmentStage: string[];
  portfolioCompanies: string[];
  totalInvestments: number;
  minimumInvestment: string;
  maximumInvestment: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface ChatConversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  updatedAt: string;
}

export interface CollaborationRequest {
  id: string;
  investorId: string;
  entrepreneurId: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  fromUser?: { name: string; avatarUrl?: string };
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface Deal {
  id: string;
  startupName: string;
  industry?: string;
  amount: string;
  equity?: string;
  status: string;
  stage: string;
  notes?: string;
  lastActivity: string;
  entrepreneur?: Entrepreneur;
  investor?: Investor;
}

export interface Document {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  description?: string;
  version: number;
  status: 'draft' | 'pending_review' | 'approved' | 'archived';
  url: string;
  previewUrl?: string;
  signatureUrl?: string;
  uploadedBy: string;
  storageProvider: 'local' | 's3';
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole, profile?: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: (userId: string, updates: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}