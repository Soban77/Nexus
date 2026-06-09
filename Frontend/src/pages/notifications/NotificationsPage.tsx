import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bell, MessageCircle, UserPlus, DollarSign, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardBody } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { getNotifications, markAllNotificationsRead, NotificationItem } from '../../data/notifications';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    const data = await getNotifications();
    setNotifications(data);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle size={16} className="text-primary-600" />;
      case 'connection':
        return <UserPlus size={16} className="text-secondary-600" />;
      case 'investment':
      case 'deal':
        return <DollarSign size={16} className="text-accent-600" />;
      case 'meeting':
        return <Calendar size={16} className="text-primary-600" />;
      default:
        return <Bell size={16} className="text-gray-600" />;
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleOpen = (notification: NotificationItem) => {
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">Stay updated with your network activity</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
          Mark all as read
        </Button>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card>
            <CardBody className="text-center py-10 text-gray-500">No notifications yet</CardBody>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors duration-200 cursor-pointer ${notification.read ? '' : 'bg-primary-50'}`}
              onClick={() => handleOpen(notification)}
            >
              <CardBody className="flex items-start p-4">
                <Avatar
                  src={notification.fromUser?.avatarUrl || ''}
                  alt={notification.fromUser?.name || 'System'}
                  size="md"
                  className="flex-shrink-0 mr-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{notification.title}</span>
                    {!notification.read && <Badge variant="primary" size="sm" rounded>New</Badge>}
                  </div>
                  <p className="text-gray-600 mt-1">{notification.content}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    {getNotificationIcon(notification.type)}
                    <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
