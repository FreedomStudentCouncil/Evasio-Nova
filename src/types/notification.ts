import { Timestamp } from 'firebase/firestore';

export interface Notification {
  id: string;
  userId: string;
  type: 'comment' | 'reply' | 'like';
  articleId: string;
  articleTitle: string;
  senderId: string;
  senderName: string;
  read: boolean;
  createdAt: Timestamp;
  content: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
}
