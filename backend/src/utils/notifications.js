import Notification from '../models/Notification.js';

export const createNotification = async ({ userId, type, title, content, fromUserId, link }) => {
  try {
    return await Notification.create({
      user: userId,
      type,
      title,
      content,
      fromUser: fromUserId,
      link
    });
  } catch (error) {
    console.error('Failed to create notification', error);
    return null;
  }
};
