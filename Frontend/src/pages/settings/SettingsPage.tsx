import React, { useEffect, useState } from 'react';
import { User, Lock, CreditCard, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { depositFunds, getPaymentHistory, withdrawFunds, Transaction } from '../../data/payments';
import { Entrepreneur, FundingRound, TeamMember } from '../../types';

type SettingsTab = 'profile' | 'startup' | 'security' | 'billing';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [startupName, setStartupName] = useState('');
  const [pitchSummary, setPitchSummary] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [marketOpportunity, setMarketOpportunity] = useState('');
  const [competitiveAdvantage, setCompetitiveAdvantage] = useState('');
  const [fundingNeeded, setFundingNeeded] = useState('');
  const [industry, setIndustry] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [valuation, setValuation] = useState('');
  const [previousFunding, setPreviousFunding] = useState('');
  const [currentFundingStage, setCurrentFundingStage] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [fundingTimeline, setFundingTimeline] = useState<FundingRound[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [amount, setAmount] = useState('100');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const ent = user as Entrepreneur;
    setName(user.name || '');
    setBio(user.bio || '');
    setLocation(ent.location || '');
    setAvatarUrl(user.avatarUrl || '');
    setStartupName(ent.startupName || '');
    setPitchSummary(ent.pitchSummary || '');
    setProblemStatement(ent.problemStatement || '');
    setMarketOpportunity(ent.marketOpportunity || '');
    setCompetitiveAdvantage(ent.competitiveAdvantage || '');
    setFundingNeeded(ent.fundingNeeded || '');
    setIndustry(ent.industry || '');
    setFoundedYear(ent.foundedYear ? String(ent.foundedYear) : '');
    setTeamSize(ent.teamSize ? String(ent.teamSize) : '');
    setValuation(ent.valuation || '');
    setPreviousFunding(ent.previousFunding || '');
    setCurrentFundingStage(ent.currentFundingStage || '');
    setTeamMembers(ent.teamMembers?.length ? ent.teamMembers : [{ name: user.name, role: 'Founder & CEO', avatarUrl: user.avatarUrl }]);
    setFundingTimeline(ent.fundingTimeline || []);
  }, [user]);

  useEffect(() => {
    if (activeTab === 'billing') {
      getPaymentHistory().then(setTransactions);
    }
  }, [activeTab]);

  if (!user) return null;

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile(user.id, { name, bio, avatarUrl, location } as any);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStartup = async () => {
    setIsSaving(true);
    try {
      await updateProfile(user.id, {
        startupName,
        pitchSummary,
        problemStatement,
        marketOpportunity,
        competitiveAdvantage,
        fundingNeeded,
        industry,
        location,
        foundedYear: foundedYear ? Number(foundedYear) : undefined,
        teamSize: teamSize ? Number(teamSize) : undefined,
        valuation,
        previousFunding,
        currentFundingStage,
        teamMembers,
        fundingTimeline
      } as any);
      toast.success('Startup profile saved');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeposit = async () => {
    try {
      await depositFunds(Number(amount));
      toast.success('Deposit completed');
      setTransactions(await getPaymentHistory());
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdrawFunds(Number(amount));
      toast.success('Withdrawal completed');
      setTransactions(await getPaymentHistory());
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const updateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
    setTeamMembers((prev) => prev.map((member, i) => (i === index ? { ...member, [field]: value } : member)));
  };

  const addTeamMember = () => {
    setTeamMembers((prev) => [...prev, { name: '', role: '', avatarUrl: '' }]);
  };

  const addFundingRound = () => {
    setFundingTimeline((prev) => [...prev, { stage: '', status: 'In Progress' }]);
  };

  const updateFundingRound = (index: number, field: keyof FundingRound, value: string) => {
    setFundingTimeline((prev) => prev.map((round, i) => (i === index ? { ...round, [field]: value } : round)));
  };

  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Profile', icon: <User size={18} /> },
    ...(user.role === 'entrepreneur' ? [{ id: 'startup' as SettingsTab, label: 'My Startup', icon: <Building2 size={18} /> }] : []),
    { id: 'security' as SettingsTab, label: 'Security', icon: <Lock size={18} /> },
    { id: 'billing' as SettingsTab, label: 'Billing', icon: <CreditCard size={18} /> }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account preferences and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardBody className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab.id ? 'text-primary-700 bg-primary-50' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-3">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </CardBody>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader><h2 className="text-lg font-medium text-gray-900">Profile Settings</h2></CardHeader>
              <CardBody className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar src={avatarUrl} alt={name} size="xl" />
                  <div className="flex-1">
                    <Input label="Avatar URL" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} fullWidth />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
                  <Input label="Email" type="email" value={user.email} disabled fullWidth />
                  <Input label="Role" value={user.role} disabled fullWidth />
                  <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} fullWidth />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} isLoading={isSaving}>Save Changes</Button>
                </div>
              </CardBody>
            </Card>
          )}

          {activeTab === 'startup' && user.role === 'entrepreneur' && (
            <>
              <Card>
                <CardHeader><h2 className="text-lg font-medium text-gray-900">Startup Details</h2></CardHeader>
                <CardBody className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Startup Name" value={startupName} onChange={(e) => setStartupName(e.target.value)} fullWidth />
                    <Input label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} fullWidth />
                    <Input label="Funding Needed" value={fundingNeeded} onChange={(e) => setFundingNeeded(e.target.value)} fullWidth />
                    <Input label="Current Stage" value={currentFundingStage} onChange={(e) => setCurrentFundingStage(e.target.value)} fullWidth />
                    <Input label="Founded Year" type="number" value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} fullWidth />
                    <Input label="Team Size" type="number" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} fullWidth />
                    <Input label="Valuation" value={valuation} onChange={(e) => setValuation(e.target.value)} fullWidth />
                    <Input label="Previous Funding" value={previousFunding} onChange={(e) => setPreviousFunding(e.target.value)} fullWidth />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Problem Statement</label>
                    <textarea className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={2} value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Solution / Pitch Summary</label>
                    <textarea className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={3} value={pitchSummary} onChange={(e) => setPitchSummary(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Market Opportunity</label>
                    <textarea className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={2} value={marketOpportunity} onChange={(e) => setMarketOpportunity(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Competitive Advantage</label>
                    <textarea className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={2} value={competitiveAdvantage} onChange={(e) => setCompetitiveAdvantage(e.target.value)} />
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
                  <Button size="sm" variant="outline" onClick={addTeamMember}>Add Member</Button>
                </CardHeader>
                <CardBody className="space-y-4">
                  {teamMembers.map((member, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input label="Name" value={member.name} onChange={(e) => updateTeamMember(index, 'name', e.target.value)} fullWidth />
                      <Input label="Role" value={member.role} onChange={(e) => updateTeamMember(index, 'role', e.target.value)} fullWidth />
                      <Input label="Avatar URL" value={member.avatarUrl || ''} onChange={(e) => updateTeamMember(index, 'avatarUrl', e.target.value)} fullWidth />
                    </div>
                  ))}
                </CardBody>
              </Card>

              <Card>
                <CardHeader className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Funding Timeline</h2>
                  <Button size="sm" variant="outline" onClick={addFundingRound}>Add Round</Button>
                </CardHeader>
                <CardBody className="space-y-4">
                  {fundingTimeline.map((round, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input label="Stage" value={round.stage} onChange={(e) => updateFundingRound(index, 'stage', e.target.value)} fullWidth />
                      <Input label="Status" value={round.status} onChange={(e) => updateFundingRound(index, 'status', e.target.value)} fullWidth />
                    </div>
                  ))}
                  {fundingTimeline.length === 0 && <p className="text-sm text-gray-500">No funding rounds added yet.</p>}
                </CardBody>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveStartup} isLoading={isSaving}>Save Startup Profile</Button>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader><h2 className="text-lg font-medium text-gray-900">Change Password</h2></CardHeader>
              <CardBody className="space-y-4">
                <Input label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} fullWidth />
                <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth />
                <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} fullWidth />
                <div className="flex justify-end">
                  <Button onClick={handlePasswordUpdate} isLoading={isSaving}>Update Password</Button>
                </div>
              </CardBody>
            </Card>
          )}

          {activeTab === 'billing' && (
            <Card>
              <CardHeader><h2 className="text-lg font-medium text-gray-900">Billing & Payments</h2></CardHeader>
              <CardBody className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <Input label="Amount (USD)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} fullWidth />
                  <Button onClick={handleDeposit}>Deposit</Button>
                  <Button variant="outline" onClick={handleWithdraw}>Withdraw</Button>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Transaction History</h3>
                  {transactions.length === 0 ? (
                    <p className="text-sm text-gray-500">No transactions yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="flex justify-between items-center border border-gray-200 rounded-md px-4 py-3 text-sm">
                          <span className="capitalize">{tx.type}</span>
                          <span>${tx.amount} {tx.currency.toUpperCase()}</span>
                          <span>{tx.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
