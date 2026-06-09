import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { MessageCircle, Users, Calendar, Building2, MapPin, UserCircle, FileText, DollarSign, Send } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { findUserById } from '../../data/users';
import { createCollaborationRequest, getRequestsFromInvestor } from '../../data/collaborationRequests';
import { getDocumentsForUser } from '../../data/documents';
import { API_BASE_URL } from '../../config';
import { Entrepreneur, Document } from '../../types';

const resolveAssetUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL || ''}${url}`;
};

export const EntrepreneurProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [entrepreneur, setEntrepreneur] = useState<Entrepreneur | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentAccess, setDocumentAccess] = useState<'granted' | 'restricted'>('restricted');
  const [isLoading, setIsLoading] = useState(true);
  const [hasRequestedCollaboration, setHasRequestedCollaboration] = useState(false);
  const [hasAcceptedCollaboration, setHasAcceptedCollaboration] = useState(false);

  useEffect(() => {
    const loadEntrepreneur = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      const data = await findUserById(id);
      setEntrepreneur(data as Entrepreneur | null);

      const docResult = await getDocumentsForUser(id);
      setDocuments(docResult.documents);
      setDocumentAccess(docResult.access as 'granted' | 'restricted');

      setIsLoading(false);
    };

    loadEntrepreneur();
  }, [id]);

  useEffect(() => {
    const loadRequestStatus = async () => {
      if (!currentUser || currentUser.role !== 'investor' || !id) return;

      const requests = await getRequestsFromInvestor(currentUser.id);
      const match = requests.find((req) => String(req.entrepreneurId) === String(id));
      setHasRequestedCollaboration(Boolean(match));
      setHasAcceptedCollaboration(match?.status === 'accepted');
    };

    loadRequestStatus();
  }, [currentUser, id]);

  if (isLoading) {
    return <div className="text-center py-12">Loading entrepreneur profile...</div>;
  }

  if (!entrepreneur || entrepreneur.role !== 'entrepreneur') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Entrepreneur not found</h2>
        <p className="text-gray-600 mt-2">The entrepreneur profile you're looking for doesn't exist or has been removed.</p>
        <Link to={currentUser?.role === 'investor' ? '/dashboard/investor' : '/dashboard/entrepreneur'}>
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const isCurrentUser = String(currentUser?.id) === String(entrepreneur.id);
  const isInvestor = currentUser?.role === 'investor';

  const handleSendRequest = async () => {
    if (!isInvestor || !currentUser || !id) return;
    try {
      await createCollaborationRequest(
        currentUser.id,
        id,
        `I'm interested in learning more about ${entrepreneur.startupName} and would like to explore potential investment opportunities.`
      );
      setHasRequestedCollaboration(true);
      toast.success('Collaboration request sent');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const teamMembers = entrepreneur.teamMembers?.length
    ? entrepreneur.teamMembers
    : [{ name: entrepreneur.name, role: 'Founder & CEO', avatarUrl: entrepreneur.avatarUrl }];

  const fundingTimeline = entrepreneur.fundingTimeline?.length
    ? entrepreneur.fundingTimeline
    : entrepreneur.currentFundingStage
      ? [{ stage: entrepreneur.currentFundingStage, status: 'In Progress' }]
      : [];

  const statusColor = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes('complete')) return 'bg-green-100 text-green-800';
    if (normalized.includes('progress')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardBody className="sm:flex sm:items-start sm:justify-between p-6">
          <div className="sm:flex sm:space-x-6">
            <Avatar
              src={entrepreneur.avatarUrl}
              alt={entrepreneur.name}
              size="xl"
              status={entrepreneur.isOnline ? 'online' : 'offline'}
              className="mx-auto sm:mx-0"
            />
            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{entrepreneur.name}</h1>
              <p className="text-gray-600 flex items-center justify-center sm:justify-start mt-1">
                <Building2 size={16} className="mr-1" />
                Founder at {entrepreneur.startupName || 'Startup'}
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                {entrepreneur.industry && <Badge variant="primary">{entrepreneur.industry}</Badge>}
                {entrepreneur.location && (
                  <Badge variant="gray">
                    <MapPin size={14} className="mr-1" />
                    {entrepreneur.location}
                  </Badge>
                )}
                {entrepreneur.foundedYear && (
                  <Badge variant="accent">
                    <Calendar size={14} className="mr-1" />
                    Founded {entrepreneur.foundedYear}
                  </Badge>
                )}
                {entrepreneur.teamSize && (
                  <Badge variant="secondary">
                    <Users size={14} className="mr-1" />
                    {entrepreneur.teamSize} team members
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
            {!isCurrentUser && (
              <>
                <Link to={`/chat/${entrepreneur.id}`}>
                  <Button variant="outline" leftIcon={<MessageCircle size={18} />}>Message</Button>
                </Link>
                {isInvestor && (
                  <Button
                    leftIcon={<Send size={18} />}
                    disabled={hasRequestedCollaboration}
                    onClick={handleSendRequest}
                  >
                    {hasRequestedCollaboration ? 'Request Sent' : 'Request Collaboration'}
                  </Button>
                )}
              </>
            )}
            {isCurrentUser && (
              <Button variant="outline" leftIcon={<UserCircle size={18} />} onClick={() => navigate('/settings')}>
                Edit Profile
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><h2 className="text-lg font-medium text-gray-900">About</h2></CardHeader>
            <CardBody>
              <p className="text-gray-700">{entrepreneur.bio || 'No bio provided yet.'}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="text-lg font-medium text-gray-900">Startup Overview</h2></CardHeader>
            <CardBody className="space-y-4">
              {entrepreneur.problemStatement && (
                <div>
                  <h3 className="text-md font-medium text-gray-900">Problem Statement</h3>
                  <p className="text-gray-700 mt-1">{entrepreneur.problemStatement}</p>
                </div>
              )}
              {entrepreneur.pitchSummary && (
                <div>
                  <h3 className="text-md font-medium text-gray-900">Solution</h3>
                  <p className="text-gray-700 mt-1">{entrepreneur.pitchSummary}</p>
                </div>
              )}
              {entrepreneur.marketOpportunity && (
                <div>
                  <h3 className="text-md font-medium text-gray-900">Market Opportunity</h3>
                  <p className="text-gray-700 mt-1">{entrepreneur.marketOpportunity}</p>
                </div>
              )}
              {entrepreneur.competitiveAdvantage && (
                <div>
                  <h3 className="text-md font-medium text-gray-900">Competitive Advantage</h3>
                  <p className="text-gray-700 mt-1">{entrepreneur.competitiveAdvantage}</p>
                </div>
              )}
              {!entrepreneur.problemStatement && !entrepreneur.pitchSummary && !entrepreneur.marketOpportunity && !entrepreneur.competitiveAdvantage && (
                <p className="text-gray-500 text-sm">Startup details haven't been added yet. {isCurrentUser && 'Edit your profile in Settings to add them.'}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Team</h2>
              <span className="text-sm text-gray-500">{teamMembers.length} members</span>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {teamMembers.map((member, index) => (
                  <div key={index} className="flex items-center p-3 border border-gray-200 rounded-md">
                    <Avatar
                      src={member.avatarUrl || entrepreneur.avatarUrl}
                      alt={member.name}
                      size="md"
                      className="mr-3"
                    />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{member.name}</h3>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><h2 className="text-lg font-medium text-gray-900">Funding</h2></CardHeader>
            <CardBody className="space-y-4">
              {entrepreneur.fundingNeeded && (
                <div>
                  <span className="text-sm text-gray-500">Current Round</span>
                  <div className="flex items-center mt-1">
                    <DollarSign size={18} className="text-accent-600 mr-1" />
                    <p className="text-lg font-semibold text-gray-900">{entrepreneur.fundingNeeded}</p>
                  </div>
                </div>
              )}
              {entrepreneur.currentFundingStage && (
                <div>
                  <span className="text-sm text-gray-500">Stage</span>
                  <p className="text-md font-medium text-gray-900">{entrepreneur.currentFundingStage}</p>
                </div>
              )}
              {entrepreneur.valuation && (
                <div>
                  <span className="text-sm text-gray-500">Valuation</span>
                  <p className="text-md font-medium text-gray-900">{entrepreneur.valuation}</p>
                </div>
              )}
              {entrepreneur.previousFunding && (
                <div>
                  <span className="text-sm text-gray-500">Previous Funding</span>
                  <p className="text-md font-medium text-gray-900">{entrepreneur.previousFunding}</p>
                </div>
              )}
              {fundingTimeline.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Funding Timeline</span>
                  <div className="mt-2 space-y-2">
                    {fundingTimeline.map((round, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-xs font-medium">{round.stage}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(round.status)}`}>{round.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!entrepreneur.fundingNeeded && !entrepreneur.valuation && !entrepreneur.previousFunding && (
                <p className="text-sm text-gray-500">Funding details not provided yet.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="text-lg font-medium text-gray-900">Documents</h2></CardHeader>
            <CardBody>
              {documentAccess === 'granted' && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                      <div className="p-2 bg-primary-50 rounded-md mr-3">
                        <FileText size={18} className="text-primary-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</h3>
                        <p className="text-xs text-gray-500">
                          Updated {formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}
                        </p>
                      </div>
                      <a href={resolveAssetUrl(doc.url)} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm">View</Button>
                      </a>
                    </div>
                  ))}
                </div>
              ) : documentAccess === 'granted' ? (
                <p className="text-sm text-gray-500">
                  {isCurrentUser ? 'No documents uploaded yet. Add documents from the Documents page.' : 'No documents available.'}
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  Documents are private. Send a collaboration request and wait for acceptance to access startup documents.
                </p>
              )}

              {!isCurrentUser && isInvestor && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {!hasAcceptedCollaboration && (
                    <p className="text-sm text-gray-500 mb-3">
                      Request access to detailed documents and financials by sending a collaboration request.
                    </p>
                  )}
                  {!hasRequestedCollaboration ? (
                    <Button className="w-full" onClick={handleSendRequest}>Request Collaboration</Button>
                  ) : hasAcceptedCollaboration ? (
                    <Button className="w-full" variant="outline" disabled>Collaboration Accepted</Button>
                  ) : (
                    <Button className="w-full" disabled>Request Sent</Button>
                  )}
                </div>
              )}

              {isCurrentUser && (
                <Button className="mt-4 w-full" variant="outline" onClick={() => navigate('/documents')}>
                  Manage Documents
                </Button>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
