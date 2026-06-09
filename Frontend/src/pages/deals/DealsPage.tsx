import React, { useEffect, useState } from 'react';
import { Search, Filter, DollarSign, TrendingUp, Users, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { createDeal, getDealStats, getDeals, updateDeal, Deal } from '../../data/deals';
import { getUsersByRole } from '../../data/users';

export const DealsPage: React.FC = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stats, setStats] = useState({ totalInvestment: 0, activeDeals: 0, portfolioCompanies: 0, closedThisMonth: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [entrepreneurs, setEntrepreneurs] = useState<any[]>([]);
  const [form, setForm] = useState({
    entrepreneurId: '',
    startupName: '',
    industry: '',
    amount: '',
    equity: '',
    status: 'Due Diligence',
    stage: 'Seed'
  });

  const statuses = ['Due Diligence', 'Term Sheet', 'Negotiation', 'Closed', 'Passed'];

  const loadData = async () => {
    const [dealList, dealStats] = await Promise.all([getDeals(), getDealStats()]);
    setDeals(dealList);
    if (dealStats) setStats(dealStats);
  };

  useEffect(() => {
    loadData();
    getUsersByRole('entrepreneur').then(setEntrepreneurs);
  }, []);

  const toggleStatus = (status: string) => {
    setSelectedStatus((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Due Diligence': return 'primary';
      case 'Term Sheet': return 'secondary';
      case 'Negotiation': return 'accent';
      case 'Closed': return 'success';
      case 'Passed': return 'error';
      default: return 'gray';
    }
  };

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      searchQuery === '' ||
      deal.startupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deal.industry || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(deal.status);
    return matchesSearch && matchesStatus;
  });

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDeal(form);
      toast.success('Deal created');
      setShowForm(false);
      setForm({ entrepreneurId: '', startupName: '', industry: '', amount: '', equity: '', status: 'Due Diligence', stage: 'Seed' });
      await loadData();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleEntrepreneurChange = (entrepreneurId: string) => {
    const entrepreneur = entrepreneurs.find((item) => item.id === entrepreneurId);
    setForm({
      ...form,
      entrepreneurId,
      startupName: entrepreneur?.startupName || '',
      industry: entrepreneur?.industry || ''
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investment Deals</h1>
          <p className="text-gray-600">Track and manage your investment pipeline</p>
        </div>
        <Button onClick={() => setShowForm((prev) => !prev)}>Add Deal</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><h2 className="text-lg font-medium text-gray-900">Create Deal</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleCreateDeal} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entrepreneur</label>
                <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.entrepreneurId} onChange={(e) => handleEntrepreneurChange(e.target.value)} required>
                  <option value="">Select startup</option>
                  {entrepreneurs.map((entrepreneur) => (
                    <option key={entrepreneur.id} value={entrepreneur.id}>{entrepreneur.startupName || entrepreneur.name}</option>
                  ))}
                </select>
              </div>
              <Input label="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required fullWidth />
              <Input label="Startup Name" value={form.startupName} onChange={(e) => setForm({ ...form, startupName: e.target.value })} required fullWidth />
              <Input label="Equity" value={form.equity} onChange={(e) => setForm({ ...form, equity: e.target.value })} fullWidth />
              <Input label="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} fullWidth />
              <Input label="Stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} fullWidth />
              <div className="md:col-span-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Create Deal</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardBody><div className="flex items-center"><div className="p-3 bg-primary-100 rounded-lg mr-3"><DollarSign size={20} className="text-primary-600" /></div><div><p className="text-sm text-gray-600">Total Investment</p><p className="text-lg font-semibold text-gray-900">${stats.totalInvestment.toFixed(1)}M</p></div></div></CardBody></Card>
        <Card><CardBody><div className="flex items-center"><div className="p-3 bg-secondary-100 rounded-lg mr-3"><TrendingUp size={20} className="text-secondary-600" /></div><div><p className="text-sm text-gray-600">Active Deals</p><p className="text-lg font-semibold text-gray-900">{stats.activeDeals}</p></div></div></CardBody></Card>
        <Card><CardBody><div className="flex items-center"><div className="p-3 bg-accent-100 rounded-lg mr-3"><Users size={20} className="text-accent-600" /></div><div><p className="text-sm text-gray-600">Portfolio Companies</p><p className="text-lg font-semibold text-gray-900">{stats.portfolioCompanies}</p></div></div></CardBody></Card>
        <Card><CardBody><div className="flex items-center"><div className="p-3 bg-success-100 rounded-lg mr-3"><Calendar size={20} className="text-success-600" /></div><div><p className="text-sm text-gray-600">Closed This Month</p><p className="text-lg font-semibold text-gray-900">{stats.closedThisMonth}</p></div></div></CardBody></Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-2/3">
          <Input placeholder="Search deals by startup name or industry..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} startAdornment={<Search size={18} />} fullWidth />
        </div>
        <div className="w-full md:w-1/3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <Badge key={status} variant={selectedStatus.includes(status) ? getStatusColor(status) : 'gray'} className="cursor-pointer" onClick={() => toggleStatus(status)}>
                  {status}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><h2 className="text-lg font-medium text-gray-900">Active Deals</h2></CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Startup</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDeals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar src={deal.entrepreneur?.avatarUrl || ''} alt={deal.startupName} size="sm" className="flex-shrink-0" />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{deal.startupName}</div>
                          <div className="text-sm text-gray-500">{deal.industry}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deal.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deal.equity || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><Badge variant={getStatusColor(deal.status)}>{deal.status}</Badge></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deal.stage}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(deal.lastActivity).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="outline" size="sm" onClick={() => setSelectedDeal(deal)}>View Details</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {selectedDeal && (
        <Card>
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">{selectedDeal.startupName}</h2>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDeal(null)}>Close</Button>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-gray-600">Amount: {selectedDeal.amount} • Equity: {selectedDeal.equity || 'N/A'} • Stage: {selectedDeal.stage}</p>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <Button key={status} size="sm" variant={selectedDeal.status === status ? 'primary' : 'outline'} onClick={async () => {
                  try {
                    const updated = await updateDeal(selectedDeal.id, { status } as any);
                    setSelectedDeal(updated);
                    await loadData();
                    toast.success('Deal updated');
                  } catch (error) {
                    toast.error((error as Error).message);
                  }
                }}>
                  {status}
                </Button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
