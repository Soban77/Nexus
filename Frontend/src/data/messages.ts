import { Message, ChatConversation } from '../types';
import { API_BASE_URL } from '../config';

const getAuthHeaders = () => {
  const token = localStorage.getItem('business_nexus_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const normalizeMessage = (message: any): Message => ({
  id: message._id || message.id,
  senderId: message.sender?._id || message.senderId,
  receiverId: message.receiver?._id || message.receiverId,
  content: message.content,
  timestamp: message.createdAt || message.timestamp,
  isRead: message.isRead ?? false
});

const normalizeConversation = (conv: any): ChatConversation => ({
  id: conv.partnerId ? `conv-${conv.partnerId}` : conv._id || conv.id,
  participants: [conv.partnerId],
  lastMessage: normalizeMessage(conv.lastMessage),
  updatedAt: conv.lastMessage?.createdAt || conv.updatedAt || new Date().toISOString()
});

export const getMessagesBetweenUsers = async (user1Id: string, user2Id: string): Promise<Message[]> => {
  try {
    const res = await fetch(`${API_BASE_URL || ''}/api/messages/${user2Id}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.messages || []).map(normalizeMessage);
  } catch (error) {
    console.error('Failed to load messages', error);
    return [];
  }
};

export const getConversationsForUser = async (): Promise<ChatConversation[]> => {
  try {
    const res = await fetch(`${API_BASE_URL || ''}/api/messages`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.conversations || []).map(normalizeConversation);
  } catch (error) {
    console.error('Failed to load conversations', error);
    return [];
  }
};

export const sendMessage = async (payload: { receiverId: string; content: string; }) => {
  try {
    const res = await fetch(`${API_BASE_URL || ''}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ receiverId: payload.receiverId, content: payload.content })
    });
    if (!res.ok) throw new Error('Failed to send message');
    const data = await res.json();
    return normalizeMessage(data.message);
  } catch (error) {
    console.error('Failed to send message', error);
    throw error;
  }
};
